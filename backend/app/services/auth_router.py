"""Authentication Router - Login, Logout, Cookie JWT, Admins, WS ticket."""

from __future__ import annotations

import logging
import secrets
from datetime import timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models
from ..database import get_db
from ..schemas import OTPResponse, SendOTPRequest, VerifyOTPRequest
from .auth_deps import (
    COOKIE_NAME,
    check_and_lock_idempotency,
    clear_auth_cookie,
    get_client_ip,
    get_current_user,
    get_optional_user,
    release_idempotency_lock,
    require_roles,
    set_auth_cookie,
    store_idempotency_result,
)
from .google_oauth import (
    GOOGLE_OAUTH_ENABLED,
    GoogleExchangeRequest,
    exchange_google_login_code,
    google_auth_callback,
    google_auth_redirect,
)
from .redis_store import get_del, set_ex
from .security import (
    RateLimiter,
    create_access_token,
    hash_password,
    validate_username,
    verify_password,
)
from .sms_otp import normalize_phone, send_otp, verify_otp

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 1800
    user: dict[str, Any]


class TokenValidationResponse(BaseModel):
    valid: bool
    user: Optional[dict[str, Any]] = None
    message: str = ""


class AdminCreate(BaseModel):
    username: str
    password: str = Field(min_length=6)
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "operator"


class AdminUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


def _user_payload(user: models.AdminUser) -> dict[str, Any]:
    return {
        "id": user.id,
        "username": user.username,
        "fullName": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "clearanceLevel": user.clearance_level,
        "avatar": user.avatar_path,
        "lastLogin": user.last_login.isoformat() if user.last_login else None,
        "isActive": user.is_active,
        "isOnline": True,
    }


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    ip_address = get_client_ip(request)
    rate_limiter = RateLimiter(db)

    is_limited, seconds_remaining = await rate_limiter.is_rate_limited(
        login_data.username, ip_address
    )
    if is_limited:
        minutes = max(1, seconds_remaining // 60)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"تعداد تلاش‌های ناموفق بیش از حد مجاز. لطفا {minutes} دقیقه دیگر تلاش کنید.",
            headers={"Retry-After": str(seconds_remaining)},
        )

    if not validate_username(login_data.username):
        await rate_limiter.record_attempt(login_data.username, ip_address, False)
        raise HTTPException(status_code=400, detail="نام کاربری نامعتبر است")

    result = await db.execute(
        select(models.AdminUser).where(
            models.AdminUser.username == login_data.username,
            models.AdminUser.is_active == True,  # noqa: E712
        )
    )
    user = result.scalars().first()
    if not user or not verify_password(login_data.password, str(user.hashed_password)):
        await rate_limiter.record_attempt(login_data.username, ip_address, False)
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است")

    await rate_limiter.record_attempt(login_data.username, ip_address, True)
    user.last_login = models.utc_now()
    await db.commit()

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    set_auth_cookie(response, access_token)
    logger.info("User '%s' logged in from %s", user.username, ip_address)
    return LoginResponse(access_token=access_token, expires_in=1800, user=_user_payload(user))


@router.post("/logout")
async def logout(
    response: Response,
    current_user: models.AdminUser = Depends(get_current_user),
) -> dict[str, Any]:
    clear_auth_cookie(response)
    logger.info("User '%s' logged out", current_user.username)
    return {"ok": True, "message": "با موفقیت خارج شدید"}


@router.get("/validate", response_model=TokenValidationResponse)
async def validate_token(
    current_user: Optional[models.AdminUser] = Depends(get_optional_user),
) -> TokenValidationResponse:
    if not current_user:
        return TokenValidationResponse(valid=False, message="توکن نامعتبر یا منقضی شده")
    return TokenValidationResponse(
        valid=True, message="توکن معتبر است", user=_user_payload(current_user)
    )


@router.get("/me")
async def get_me(current_user: models.AdminUser = Depends(get_current_user)) -> dict[str, Any]:
    return _user_payload(current_user)


@router.post("/ws-ticket")
async def ws_ticket(current_user: models.AdminUser = Depends(get_current_user)) -> dict[str, Any]:
    ticket = secrets.token_urlsafe(24)
    token = create_access_token(
        data={"sub": current_user.username, "role": current_user.role, "ws": True},
        expires_delta=timedelta(seconds=60),
    )
    set_ex(f"ws_ticket:{ticket}", token, 60)
    return {"ticket": ticket, "expires_in": 60}


async def consume_ws_ticket(ticket: str) -> Optional[str]:
    return get_del(f"ws_ticket:{ticket}")


@router.get("/admins")
async def list_admins(
    db: AsyncSession = Depends(get_db),
    _: models.AdminUser = Depends(require_roles("admin")),
) -> list[dict[str, Any]]:
    result = await db.execute(select(models.AdminUser).order_by(models.AdminUser.id))
    return [_user_payload(u) for u in result.scalars().all()]


@router.post("/admins", status_code=201)
async def create_admin(
    data: AdminCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.AdminUser = Depends(require_roles("admin")),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> dict[str, Any]:
    cached, idem_lock = check_and_lock_idempotency(
        "create_admin", idempotency_key, int(current_admin.id)
    )
    if cached is not None:
        return dict(cached)

    try:
        if data.role not in ("admin", "operator"):
            raise HTTPException(400, "نقش نامعتبر")
        if not validate_username(data.username):
            raise HTTPException(400, "نام کاربری نامعتبر است")

        exists = await db.execute(
            select(models.AdminUser).where(models.AdminUser.username == data.username)
        )
        if exists.scalars().first():
            raise HTTPException(400, "نام کاربری تکراری است")

        normalized_phone: Optional[str] = None
        if data.phone is not None and data.phone.strip():
            normalized_phone = normalize_phone(data.phone)
            if not normalized_phone:
                raise HTTPException(400, "فرمت شماره تلفن نامعتبر است")
            phone_exists = await db.execute(
                select(models.AdminUser).where(models.AdminUser.phone == normalized_phone)
            )
            if phone_exists.scalars().first():
                raise HTTPException(400, "شماره تلفن تکراری است")

        user = models.AdminUser(
            username=data.username,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            email=data.email,
            phone=normalized_phone,
            role=data.role,
        )
        db.add(user)
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(409, "نام کاربری یا شماره تلفن تکراری است") from exc
        await db.refresh(user)
        payload = _user_payload(user)
        store_idempotency_result(idem_lock, payload)
        return payload
    except Exception:
        release_idempotency_lock(idem_lock)
        raise


@router.patch("/admins/{admin_id}")
async def update_admin(
    admin_id: int,
    data: AdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.AdminUser = Depends(require_roles("admin")),
) -> dict[str, Any]:
    result = await db.execute(select(models.AdminUser).where(models.AdminUser.id == admin_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "کاربر یافت نشد")

    if user.id == current_admin.id:
        if data.is_active is False:
            raise HTTPException(400, "امکان غیرفعال کردن حساب خودتان وجود ندارد")
        if data.role is not None and data.role != current_admin.role:
            raise HTTPException(400, "امکان تغییر نقش حساب خودتان وجود ندارد")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.email is not None:
        user.email = data.email
    if data.phone is not None:
        if data.phone.strip() == "":
            user.phone = None
        else:
            normalized_phone = normalize_phone(data.phone)
            if not normalized_phone:
                raise HTTPException(400, "فرمت شماره تلفن نامعتبر است")
            dup_phone = await db.execute(
                select(models.AdminUser).where(
                    models.AdminUser.phone == normalized_phone,
                    models.AdminUser.id != admin_id,
                )
            )
            if dup_phone.scalars().first():
                raise HTTPException(400, "شماره تلفن تکراری است")
            user.phone = normalized_phone
    if data.role is not None:
        if data.role not in ("admin", "operator"):
            raise HTTPException(400, "نقش نامعتبر")
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password is not None and data.password != "":
        if len(data.password) < 6:
            raise HTTPException(400, "رمز عبور باید حداقل ۶ کاراکتر باشد")
        user.hashed_password = hash_password(data.password)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(409, "نام کاربری یا شماره تلفن تکراری است") from exc
    await db.refresh(user)
    return _user_payload(user)


# --- Google / SMS ---


@router.get("/google")
async def google_login(request: Request) -> Any:
    if not GOOGLE_OAUTH_ENABLED:
        raise HTTPException(status_code=501, detail="ورود با گوگل فعال نیست")
    return await google_auth_redirect(request)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)) -> Any:
    if not GOOGLE_OAUTH_ENABLED:
        raise HTTPException(status_code=501, detail="ورود با گوگل فعال نیست")
    return await google_auth_callback(request, db)


@router.post("/google/exchange")
async def google_exchange(data: GoogleExchangeRequest, response: Response) -> dict[str, Any]:
    result = await exchange_google_login_code(data.code)
    token = result.get("access_token")
    if token:
        set_auth_cookie(response, token)
    return result


@router.post("/otp/send", response_model=OTPResponse)
async def send_mobile_otp(
    request: Request,
    data: SendOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> OTPResponse:
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    result = await send_otp(data.phone, db, client_ip, user_agent)
    return OTPResponse(
        success=bool(result["success"]),
        message=str(result["message"]),
        phone_masked=result.get("phone_masked"),
        expires_in=result.get("expires_in"),
    )


@router.post("/otp/verify")
async def verify_mobile_otp(
    request: Request,
    response: Response,
    data: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    result = await verify_otp(data.phone, data.otp, db, client_ip, user_agent)
    token = result.get("access_token")
    if token:
        set_auth_cookie(response, token)
    return result


@router.post("/otp/resend", response_model=OTPResponse)
async def resend_mobile_otp(
    request: Request,
    data: SendOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> OTPResponse:
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    result = await send_otp(data.phone, db, client_ip, user_agent)
    return OTPResponse(
        success=bool(result["success"]),
        message="کد تأیید مجدداً ارسال شد",
        phone_masked=result.get("phone_masked"),
        expires_in=result.get("expires_in"),
    )


__all__ = ["router", "get_current_user", "get_optional_user", "COOKIE_NAME", "consume_ws_ticket"]
