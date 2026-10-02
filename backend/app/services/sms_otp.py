"""
SMS OTP Service
Handles SMS OTP authentication with MeliPayamak integration.
"""

import logging
import os
import random
import re
from datetime import datetime, timedelta, timezone
from typing import Tuple

from fastapi import HTTPException, Request
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models
from .melipayamak import Api
from .security import create_access_token, hash_password

logger = logging.getLogger("uvicorn")

# SMS Configuration from environment
SMS_USERNAME = os.getenv("SMS_USERNAME")
SMS_PASSWORD = os.getenv("SMS_PASSWORD")
SMS_SENDER_NUMBER = os.getenv("SMS_SENDER_NUMBER")

# OTP Configuration
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
MAX_OTP_ATTEMPTS = 3
MAX_OTP_PER_HOUR = 5

# Token expiry
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Check if SMS is configured
SMS_ENABLED = bool(SMS_USERNAME and SMS_PASSWORD and SMS_SENDER_NUMBER)
if not SMS_ENABLED:
    logger.warning("⚠️ SMS not configured - set SMS_USERNAME, SMS_PASSWORD, SMS_SENDER_NUMBER")


def get_client_ip(request: Request) -> str:
    """Get client IP from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def mask_phone(phone: str) -> str:
    """Mask phone number: 9123456789 -> 9123****89"""
    if len(phone) >= 10:
        return f"{phone[:4]}****{phone[-2:]}"
    return phone


def normalize_phone(phone: str) -> str:
    """
    Normalize Iranian phone number to 10 digits (9xxxxxxxxx)
    Accepts: 0912..., 98912..., +98912..., 912...
    """
    if not phone:
        return ""

    phone = phone.strip()
    # Remove non-digits except leading +
    if phone.startswith("+"):
        phone = "+" + re.sub(r"[^\d]", "", phone[1:])
    else:
        phone = re.sub(r"[^\d]", "", phone)

    # Remove country code
    if phone.startswith("+98"):
        phone = phone[3:]
    elif phone.startswith("0098"):
        phone = phone[4:]
    elif phone.startswith("98") and len(phone) == 12:
        phone = phone[2:]
    elif phone.startswith("0"):
        phone = phone[1:]

    # Validate: 10 digits starting with 9
    if len(phone) == 10 and phone.startswith("9"):
        return phone
    return ""


def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return "".join([str(random.randint(0, 9)) for _ in range(OTP_LENGTH)])


async def send_sms(phone: str, message: str) -> bool:
    """Send SMS using MeliPayamak API"""
    if not SMS_ENABLED:
        logger.warning(f"SMS not configured, would send to {phone}: {message}")
        return False

    try:
        # Format phone for SMS API (with leading 0)
        sms_phone = "0" + phone if not phone.startswith("0") else phone

        api = Api(SMS_USERNAME, SMS_PASSWORD)
        sms = api.sms()
        response = sms.send(sms_phone, SMS_SENDER_NUMBER, message)

        if response and "error" not in str(response).lower():
            logger.info(f"SMS sent successfully to {mask_phone(phone)}")
            return True
        else:
            logger.error(f"SMS send failed: {response}")
            return False

    except Exception as e:
        logger.error(f"SMS send error: {e}")
        return False


async def check_otp_rate_limit(phone: str, db: AsyncSession) -> Tuple[bool, int]:
    """
    Check if phone has exceeded OTP rate limit.
    Returns: (is_allowed, attempts_remaining)
    """
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

    # Count OTPs sent in the last hour
    result = await db.execute(
        select(models.MobileOTP).where(models.MobileOTP.phone == phone, models.MobileOTP.created_at >= one_hour_ago)
    )
    recent_otps = result.scalars().all()
    count = len(recent_otps)

    remaining = MAX_OTP_PER_HOUR - count
    return (remaining > 0, max(0, remaining))


async def cleanup_expired_otps(db: AsyncSession):
    """Delete expired OTPs"""
    await db.execute(delete(models.MobileOTP).where(models.MobileOTP.expires_at < datetime.now(timezone.utc)))
    await db.commit()


async def send_otp(phone: str, db: AsyncSession, client_ip: str, user_agent: str) -> dict:
    """Send OTP to phone number"""

    # Normalize phone
    normalized_phone = normalize_phone(phone)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="فرمت شماره تلفن نامعتبر است")

    # Clean up expired OTPs
    await cleanup_expired_otps(db)

    # Check rate limit
    is_allowed, remaining = await check_otp_rate_limit(normalized_phone, db)
    if not is_allowed:
        raise HTTPException(
            status_code=429, detail="تعداد درخواست‌های کد تأیید به حداکثر رسیده است. لطفاً ۱ ساعت صبر کنید."
        )

    # Generate OTP
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    # Store OTP
    new_otp = models.MobileOTP(
        phone=normalized_phone, otp=otp, expires_at=expires_at, client_ip=client_ip, user_agent=user_agent
    )
    db.add(new_otp)
    await db.commit()

    # Create SMS message
    message = (
        f"🔐 SentryGate\n\n"
        f"کد تأیید شما: {otp}\n\n"
        f"⏰ انقضا: {OTP_EXPIRY_MINUTES} دقیقه\n\n"
        f"اگر شما درخواست نکرده‌اید، نادیده بگیرید."
        f"\n\n\n"
        f"لغو11"
    )

    # Send SMS
    sms_sent = await send_sms(normalized_phone, message)

    logger.info(f"OTP sent to {mask_phone(normalized_phone)} from {client_ip}")

    return {
        "success": True,
        "message": "کد تأیید ارسال شد",
        "phone_masked": mask_phone(normalized_phone),
        "expires_in": OTP_EXPIRY_MINUTES * 60,
        # For testing - remove in production
        "otp": otp if not sms_sent else None,
    }


async def verify_otp(phone: str, otp: str, db: AsyncSession, client_ip: str, user_agent: str) -> dict:
    """Verify OTP and return JWT token"""

    # Normalize phone
    normalized_phone = normalize_phone(phone)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="فرمت شماره تلفن نامعتبر است")

    # Clean up expired OTPs
    await cleanup_expired_otps(db)

    # Find latest OTP for this phone
    result = await db.execute(
        select(models.MobileOTP)
        .where(models.MobileOTP.phone == normalized_phone)
        .order_by(models.MobileOTP.created_at.desc())
    )
    otp_record = result.scalars().first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="کد تأیید یافت نشد. لطفاً کد جدید درخواست کنید.")

    # Check expiry (handle both naive and aware datetimes)
    expires_at = otp_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="کد تأیید منقضی شده است. لطفاً کد جدید درخواست کنید.")

    # Check attempts
    if otp_record.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(
            status_code=400, detail="تعداد تلاش‌های ناموفق به حداکثر رسیده است. لطفاً کد جدید درخواست کنید."
        )

    # Increment attempts
    otp_record.attempts += 1
    await db.commit()

    # Verify OTP
    if otp_record.otp != otp:
        remaining = MAX_OTP_ATTEMPTS - otp_record.attempts
        raise HTTPException(status_code=400, detail=f"کد تأیید اشتباه است. {remaining} تلاش باقی‌مانده.")

    # OTP is valid - find or create user
    user = await find_or_create_sms_user(normalized_phone, db, client_ip, user_agent)

    # Delete used OTP
    await db.execute(delete(models.MobileOTP).where(models.MobileOTP.phone == normalized_phone))
    await db.commit()

    # Create JWT token
    jwt_token = create_access_token(data={"sub": user.username, "role": user.role})

    logger.info(f"OTP verified for {mask_phone(normalized_phone)} - user: {user.username}")

    return {
        "success": True,
        "message": "ورود موفقیت‌آمیز",
        "access_token": jwt_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "username": user.username,
            "fullName": user.full_name,
            "email": user.email,
            "role": user.role,
            "clearanceLevel": user.clearance_level,
            "avatar": user.avatar_path,
            "lastLogin": user.last_login.isoformat() if user.last_login else None,
            "isOnline": True,
        },
    }


async def find_or_create_sms_user(phone: str, db: AsyncSession, client_ip: str, user_agent: str) -> models.AdminUser:
    """
    Smart identity linking for SMS login:
    1. Find by phone
    2. Find by recent IP/UserAgent (72 hours)
    3. Create new user
    """

    # 1. Check by phone
    result = await db.execute(
        select(models.AdminUser).where(models.AdminUser.phone == phone, models.AdminUser.is_active == True)
    )
    user = result.scalars().first()

    if user:
        logger.info(f"SMS Login: Found user by phone: {user.username}")
        user.last_ip = client_ip
        user.last_user_agent = user_agent
        user.last_login = datetime.now(timezone.utc)
        user.login_method = "sms"
        await db.commit()
        return user

    # 2. Check by IP/UserAgent (72 hours)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=72)
    result = await db.execute(
        select(models.AdminUser)
        .where(
            models.AdminUser.last_ip == client_ip,
            models.AdminUser.last_login > cutoff,
            models.AdminUser.is_active == True,
            or_(models.AdminUser.phone == None, models.AdminUser.phone == ""),
        )
        .order_by(models.AdminUser.last_login.desc())
    )
    user = result.scalars().first()

    if user:
        logger.info(f"SMS Login: Linking phone to user by IP fingerprint: {user.username}")
        user.phone = phone
        user.last_ip = client_ip
        user.last_user_agent = user_agent
        user.last_login = datetime.now(timezone.utc)
        user.login_method = "sms"
        await db.commit()
        return user

    # 3. Create new user
    import secrets

    username = f"mobile_{phone[-4:]}"
    random_password = secrets.token_urlsafe(32)

    # Ensure unique username
    result = await db.execute(select(models.AdminUser).where(models.AdminUser.username == username))
    if result.scalars().first():
        username = f"mobile_{phone[-4:]}_{secrets.token_hex(2)}"

    new_user = models.AdminUser(
        username=username,
        hashed_password=hash_password(random_password),
        full_name=f"کاربر {phone[-4:]}",
        phone=phone,
        role="operator",
        login_method="sms",
        last_ip=client_ip,
        last_user_agent=user_agent,
        last_login=datetime.now(timezone.utc),
        is_active=True,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(f"SMS Login: Created new user: {new_user.username}")
    return new_user
