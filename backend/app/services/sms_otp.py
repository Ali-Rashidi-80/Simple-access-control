"""SMS OTP Service with CSPRNG generation, constant-time verify, atomic consume & IP rate limits."""

from __future__ import annotations

import hmac
import logging
import os
import re
import secrets
from datetime import timedelta
from typing import Any, Tuple

from fastapi import HTTPException, Request
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models
from .redis_store import incr_with_ttl
from .security import create_access_token, hash_password

logger = logging.getLogger("uvicorn")

SMS_USERNAME = os.getenv("SMS_USERNAME")
SMS_PASSWORD = os.getenv("SMS_PASSWORD")
SMS_SENDER_NUMBER = os.getenv("SMS_SENDER_NUMBER")

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
MAX_OTP_ATTEMPTS = 3
MAX_OTP_PER_HOUR = 5
MAX_OTP_PER_IP_HOUR = int(os.getenv("MAX_OTP_PER_IP_HOUR", "20"))
ALLOW_OTP_AUTO_REGISTER = os.getenv("ALLOW_OTP_AUTO_REGISTER", "false").lower() == "true"

ACCESS_TOKEN_EXPIRE_MINUTES = 30
SMS_ENABLED = bool(SMS_USERNAME and SMS_PASSWORD and SMS_SENDER_NUMBER)
if not SMS_ENABLED:
    logger.warning("SMS not configured - set SMS_USERNAME, SMS_PASSWORD, SMS_SENDER_NUMBER")


def get_client_ip(request: Request) -> str:
    """Get client IP; honor X-Forwarded-For only from trusted proxies."""
    from .auth_deps import get_client_ip as _trusted_ip

    return _trusted_ip(request)


def mask_phone(phone: str) -> str:
    """Mask phone number: 9123456789 -> 9123****89."""
    if len(phone) >= 10:
        return f"{phone[:4]}****{phone[-2:]}"
    return "****"


def normalize_phone(phone: str) -> str:
    """
    Normalize Iranian phone number to 10 digits (9xxxxxxxxx).
    Accepts: 0912..., 98912..., +98912..., 912...
    """
    if not phone:
        return ""
    cleaned = phone.strip()
    if cleaned.startswith("+"):
        cleaned = "+" + re.sub(r"[^\d]", "", cleaned[1:])
    else:
        cleaned = re.sub(r"[^\d]", "", cleaned)

    if cleaned.startswith("+98"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("0098"):
        cleaned = cleaned[4:]
    elif cleaned.startswith("98") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0"):
        cleaned = cleaned[1:]

    if len(cleaned) == 10 and cleaned.startswith("9"):
        return cleaned
    return ""


def generate_otp() -> str:
    """Generate 6-digit OTP using CSPRNG."""
    return "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))


async def send_sms(phone: str, message: str) -> bool:
    """Send SMS using MeliPayamak API without ever logging OTP or message body."""
    masked = mask_phone(phone)
    if not SMS_ENABLED:
        logger.warning(
            "SMS not configured; skipped send to %s (len=%s)", masked, len(message or "")
        )
        return False

    try:
        from .melipayamak import Api

        sms_phone = "0" + phone if not phone.startswith("0") else phone
        api = Api(SMS_USERNAME, SMS_PASSWORD)
        sms = api.sms()
        response = sms.send(sms_phone, SMS_SENDER_NUMBER, message)
        if response and "error" not in str(response).lower():
            logger.info("SMS sent successfully to %s (len=%s)", masked, len(message or ""))
            return True
        logger.error("SMS send failed for %s", masked)
        return False
    except Exception as e:
        logger.error("SMS send error for %s: %s", masked, type(e).__name__)
        return False


async def check_otp_rate_limit(phone: str, db: AsyncSession) -> Tuple[bool, int]:
    """Check if phone has exceeded OTP rate limit."""
    one_hour_ago = models.utc_now() - timedelta(hours=1)
    result = await db.execute(
        select(models.MobileOTP).where(
            models.MobileOTP.phone == phone,
            models.MobileOTP.created_at >= one_hour_ago,
        )
    )
    count = len(result.scalars().all())
    remaining = MAX_OTP_PER_HOUR - count
    return (remaining > 0, max(0, remaining))


async def cleanup_expired_otps(db: AsyncSession) -> None:
    """Delete expired OTPs."""
    await db.execute(delete(models.MobileOTP).where(models.MobileOTP.expires_at < models.utc_now()))
    await db.commit()


async def send_otp(
    phone: str,
    db: AsyncSession,
    client_ip: str,
    user_agent: str,
) -> dict[str, Any]:
    """Send OTP to phone number."""
    normalized_phone = normalize_phone(phone)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="فرمت شماره تلفن نامعتبر است")

    ip_rl_key = f"otp_ip_rl:{client_ip}"
    if incr_with_ttl(ip_rl_key, 3600) > MAX_OTP_PER_IP_HOUR:
        raise HTTPException(
            status_code=429,
            detail="تعداد درخواست‌های کد تأیید از این آدرس بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
        )

    await cleanup_expired_otps(db)

    is_allowed, _ = await check_otp_rate_limit(normalized_phone, db)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail="تعداد درخواست‌های کد تأیید به حداکثر رسیده است. لطفاً ۱ ساعت صبر کنید.",
        )

    otp = generate_otp()
    expires_at = models.utc_now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    new_otp = models.MobileOTP(
        phone=normalized_phone,
        otp=otp,
        expires_at=expires_at,
        client_ip=client_ip,
        user_agent=user_agent,
    )
    db.add(new_otp)
    await db.commit()

    message = (
        f"SentryGate\n\n"
        f"کد تأیید شما: {otp}\n\n"
        f"انقضا: {OTP_EXPIRY_MINUTES} دقیقه\n\n"
        f"اگر شما درخواست نکرده‌اید، نادیده بگیرید.\n\nلغو11"
    )
    await send_sms(normalized_phone, message)
    logger.info("OTP requested for %s from %s", mask_phone(normalized_phone), client_ip)

    return {
        "success": True,
        "message": "کد تأیید ارسال شد",
        "phone_masked": mask_phone(normalized_phone),
        "expires_in": OTP_EXPIRY_MINUTES * 60,
    }


async def verify_otp(
    phone: str,
    otp: str,
    db: AsyncSession,
    client_ip: str,
    user_agent: str,
) -> dict[str, Any]:
    """Verify OTP atomically and return JWT token."""
    normalized_phone = normalize_phone(phone)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="فرمت شماره تلفن نامعتبر است")

    await cleanup_expired_otps(db)

    result = await db.execute(
        select(models.MobileOTP)
        .where(models.MobileOTP.phone == normalized_phone)
        .order_by(models.MobileOTP.created_at.desc())
    )
    otp_record = result.scalars().first()
    if not otp_record:
        raise HTTPException(
            status_code=400, detail="کد تأیید یافت نشد. لطفاً کد جدید درخواست کنید."
        )

    expires_at = otp_record.expires_at
    if expires_at.tzinfo is not None:
        expires_at = expires_at.replace(tzinfo=None)
    if expires_at < models.utc_now():
        raise HTTPException(
            status_code=400,
            detail="کد تأیید منقضی شده است. لطفاً کد جدید درخواست کنید.",
        )

    inc_res = await db.execute(
        update(models.MobileOTP)
        .where(
            models.MobileOTP.id == otp_record.id,
            models.MobileOTP.attempts < MAX_OTP_ATTEMPTS,
        )
        .values(attempts=models.MobileOTP.attempts + 1)
        .returning(models.MobileOTP.attempts)
    )
    new_attempts = inc_res.scalar()
    await db.commit()
    if new_attempts is None:
        raise HTTPException(
            status_code=400,
            detail="تعداد تلاش‌های ناموفق به حداکثر رسیده است. لطفاً کد جدید درخواست کنید.",
        )

    if not hmac.compare_digest(otp_record.otp, otp):
        remaining = max(0, MAX_OTP_ATTEMPTS - int(new_attempts))
        raise HTTPException(
            status_code=400,
            detail=f"کد تأیید اشتباه است. {remaining} تلاش باقی‌مانده.",
        )

    consume_res = await db.execute(
        delete(models.MobileOTP).where(
            models.MobileOTP.id == otp_record.id,
            models.MobileOTP.otp == otp,
        )
    )
    await db.commit()
    if not getattr(consume_res, "rowcount", 0):
        raise HTTPException(status_code=400, detail="کد تأیید قبلاً استفاده شده است.")

    await db.execute(delete(models.MobileOTP).where(models.MobileOTP.phone == normalized_phone))
    await db.commit()

    user = await find_or_create_sms_user(normalized_phone, db, client_ip, user_agent)

    jwt_token = create_access_token(data={"sub": user.username, "role": user.role})
    logger.info("OTP verified for %s - user: %s", mask_phone(normalized_phone), user.username)

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


async def find_or_create_sms_user(
    phone: str,
    db: AsyncSession,
    client_ip: str,
    user_agent: str,
) -> models.AdminUser:
    """Find user by phone, or create new operator when ALLOW_OTP_AUTO_REGISTER is enabled."""
    result = await db.execute(
        select(models.AdminUser).where(
            models.AdminUser.phone == phone,
            models.AdminUser.is_active == True,  # noqa: E712
        )
    )
    user = result.scalars().first()
    if user:
        logger.info("SMS Login: Found user by phone: %s", user.username)
        user.last_ip = client_ip
        user.last_user_agent = user_agent
        user.last_login = models.utc_now()
        user.login_method = "sms"
        await db.commit()
        return user

    allow_auto = os.getenv("ALLOW_OTP_AUTO_REGISTER", "false").lower() == "true"
    if not allow_auto:
        raise HTTPException(
            status_code=403,
            detail="ثبت‌نام خودکار با پیامک غیرفعال است. با مدیر سیستم تماس بگیرید.",
        )

    username = f"mobile_{phone[-4:]}"
    random_password = secrets.token_urlsafe(32)
    existing = await db.execute(
        select(models.AdminUser).where(models.AdminUser.username == username)
    )
    if existing.scalars().first():
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
        last_login=models.utc_now(),
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    logger.info("SMS Login: Created new user: %s", new_user.username)
    return new_user
