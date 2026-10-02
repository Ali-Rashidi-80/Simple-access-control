"""
Authentication Router - Login, Logout, Token Validation
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models
from ..database import get_db
from .security import (
    RateLimiter,
    create_access_token,
    decode_access_token,
    validate_username,
    verify_password,
)

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


# --- Request/Response Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 1800  # 30 minutes in seconds
    user: dict


class TokenValidationResponse(BaseModel):
    valid: bool
    user: Optional[dict] = None
    message: str = ""


# --- Helper Functions ---
def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)
) -> models.AdminUser:
    """Dependency to get current authenticated user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نشست شما منقضی شده است. لطفا دوباره وارد شوید.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="توکن نامعتبر است", headers={"WWW-Authenticate": "Bearer"}
        )

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="توکن معتبر نیست")

    result = await db.execute(
        select(models.AdminUser).where(models.AdminUser.username == username, models.AdminUser.is_active == True)
    )
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="کاربر یافت نشد یا غیرفعال است")

    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)
) -> Optional[models.AdminUser]:
    """Optional authentication - returns None if not authenticated"""
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


# --- Endpoints ---
@router.post("/login", response_model=LoginResponse)
async def login(request: Request, login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user and return JWT token
    """
    ip_address = get_client_ip(request)
    rate_limiter = RateLimiter(db)

    # Check rate limiting
    is_limited, seconds_remaining = await rate_limiter.is_rate_limited(login_data.username, ip_address)
    if is_limited:
        minutes = seconds_remaining // 60
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"تعداد تلاش‌های ناموفق بیش از حد مجاز. لطفا {minutes} دقیقه دیگر تلاش کنید.",
            headers={"Retry-After": str(seconds_remaining)},
        )

    # Validate username format
    if not validate_username(login_data.username):
        await rate_limiter.record_attempt(login_data.username, ip_address, False)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="نام کاربری نامعتبر است")

    # Find user
    result = await db.execute(
        select(models.AdminUser).where(
            models.AdminUser.username == login_data.username, models.AdminUser.is_active == True
        )
    )
    user = result.scalars().first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        await rate_limiter.record_attempt(login_data.username, ip_address, False)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="نام کاربری یا رمز عبور اشتباه است")

    # Record successful attempt
    await rate_limiter.record_attempt(login_data.username, ip_address, True)

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    # Generate token
    access_token = create_access_token(data={"sub": user.username, "role": user.role})

    logger.info(f"User '{user.username}' logged in from {ip_address}")

    return LoginResponse(
        access_token=access_token,
        expires_in=1800,
        user={
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
    )


@router.post("/logout")
async def logout(current_user: models.AdminUser = Depends(get_current_user)):
    """
    Logout user (client should discard token)
    """
    logger.info(f"User '{current_user.username}' logged out")
    return {"ok": True, "message": "با موفقیت خارج شدید"}


@router.get("/validate", response_model=TokenValidationResponse)
async def validate_token(current_user: models.AdminUser = Depends(get_optional_user)):
    """
    Validate current token and return user info
    """
    if not current_user:
        return TokenValidationResponse(valid=False, message="توکن نامعتبر یا منقضی شده")

    return TokenValidationResponse(
        valid=True,
        message="توکن معتبر است",
        user={
            "id": current_user.id,
            "username": current_user.username,
            "fullName": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role,
            "clearanceLevel": current_user.clearance_level,
            "avatar": current_user.avatar_path,
            "lastLogin": current_user.last_login.isoformat() if current_user.last_login else None,
            "isOnline": True,
        },
    )


@router.get("/me")
async def get_me(current_user: models.AdminUser = Depends(get_current_user)):
    """
    Get current user profile
    """
    return {
        "id": current_user.id,
        "username": current_user.username,
        "fullName": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "clearanceLevel": current_user.clearance_level,
        "avatar": current_user.avatar_path,
        "lastLogin": current_user.last_login.isoformat() if current_user.last_login else None,
        "isOnline": True,
    }


# ==========================================
# GOOGLE OAUTH ROUTES
# ==========================================

from .google_oauth import GOOGLE_OAUTH_ENABLED, google_auth_callback, google_auth_redirect


@router.get("/google")
async def google_login(request: Request):
    """Redirect to Google OAuth"""
    if not GOOGLE_OAUTH_ENABLED:
        raise HTTPException(status_code=501, detail="ورود با گوگل فعال نیست")
    return await google_auth_redirect(request)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback"""
    if not GOOGLE_OAUTH_ENABLED:
        raise HTTPException(status_code=501, detail="ورود با گوگل فعال نیست")
    return await google_auth_callback(request, db)


# ==========================================
# SMS OTP ROUTES
# ==========================================

from ..schemas import OTPResponse, SendOTPRequest, VerifyOTPRequest
from .sms_otp import send_otp, verify_otp


@router.post("/otp/send", response_model=OTPResponse)
async def send_mobile_otp(request: Request, data: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    """Send OTP to phone number"""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    result = await send_otp(data.phone, db, client_ip, user_agent)
    return OTPResponse(
        success=result["success"],
        message=result["message"],
        phone_masked=result.get("phone_masked"),
        expires_in=result.get("expires_in"),
    )


@router.post("/otp/verify")
async def verify_mobile_otp(request: Request, data: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP and login"""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    return await verify_otp(data.phone, data.otp, db, client_ip, user_agent)


@router.post("/otp/resend", response_model=OTPResponse)
async def resend_mobile_otp(request: Request, data: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    """Resend OTP to phone number"""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    result = await send_otp(data.phone, db, client_ip, user_agent)
    return OTPResponse(
        success=result["success"],
        message="کد تأیید مجدداً ارسال شد",
        phone_masked=result.get("phone_masked"),
        expires_in=result.get("expires_in"),
    )
