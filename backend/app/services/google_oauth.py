"""Google OAuth 2.0 authentication with verified-email identity linking."""

from __future__ import annotations

import json
import logging
import os
import secrets
import time
from typing import Any, Optional

import httpx
from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models
from .auth_deps import get_client_ip as trusted_client_ip
from .auth_deps import set_auth_cookie
from .redis_store import get_del, set_ex
from .security import create_access_token, hash_password

logger = logging.getLogger("uvicorn")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "https://your-domain.example.com/auth/google/callback"
)
GOOGLE_AUTH_URL = os.getenv("GOOGLE_AUTH_URL", "https://accounts.google.com/o/oauth2/v2/auth")
GOOGLE_TOKEN_URL = os.getenv("GOOGLE_TOKEN_URL", "https://oauth2.googleapis.com/token")
GOOGLE_USERINFO_URL = os.getenv(
    "GOOGLE_USERINFO_URL", "https://www.googleapis.com/oauth2/v2/userinfo"
)

GOOGLE_OAUTH_ENABLED = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
if not GOOGLE_OAUTH_ENABLED:
    logger.warning("Google OAuth not configured - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")

ACCESS_TOKEN_EXPIRE_MINUTES = 30
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


class GoogleUserInfo(BaseModel):
    """Google user info from OAuth."""

    id: str
    email: str
    name: str
    picture: Optional[str] = None
    verified_email: bool = False


def get_client_ip(request: Request) -> str:
    return trusted_client_ip(request)


async def get_google_auth_url(state: str) -> str:
    """Generate Google OAuth authorization URL."""
    if not GOOGLE_OAUTH_ENABLED:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "response_type": "code",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query_string}"


async def exchange_code_for_token(code: str) -> dict[str, Any]:
    """Exchange authorization code for access token."""
    if not GOOGLE_OAUTH_ENABLED:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    async with httpx.AsyncClient() as client:
        data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI,
        }
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        if response.status_code == 200:
            return dict(response.json())
        logger.error("Google token exchange failed: %s", response.status_code)
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")


async def get_google_user_info(access_token: str) -> GoogleUserInfo:
    """Get user info from Google."""
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await client.get(GOOGLE_USERINFO_URL, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return GoogleUserInfo(
                id=data["id"],
                email=data["email"],
                name=data.get("name", ""),
                picture=data.get("picture"),
                verified_email=bool(data.get("verified_email", False)),
            )
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")


async def find_or_create_google_user(
    google_user: GoogleUserInfo,
    db: AsyncSession,
    client_ip: str,
    user_agent: str,
) -> models.AdminUser:
    """
    Secure identity linking:
    1. Find by google_id
    2. Find by email ONLY when google_user.verified_email is True
    3. Create new operator user (never link by client IP!)
    """
    normalized_email = (google_user.email or "").strip().lower()

    # 1. Check by google_id
    result = await db.execute(
        select(models.AdminUser).where(
            models.AdminUser.google_id == google_user.id,
            models.AdminUser.is_active == True,  # noqa: E712
        )
    )
    user = result.scalars().first()
    if user:
        logger.info("Google OAuth: Found user by google_id: %s", user.username)
        user.last_ip = client_ip
        user.last_user_agent = user_agent
        user.last_login = models.utc_now()
        user.login_method = "google"
        await db.commit()
        return user

    if not google_user.verified_email or not normalized_email:
        raise HTTPException(
            status_code=403,
            detail="ایمیل حساب گوگل تأیید نشده است",
        )

    # 2. Check by verified email
    result = await db.execute(
        select(models.AdminUser).where(
            models.AdminUser.email == normalized_email,
            models.AdminUser.is_active == True,  # noqa: E712
        )
    )
    user = result.scalars().first()
    if user:
        logger.info("Google OAuth: Linking google_id to verified email user: %s", user.username)
        user.google_id = google_user.id
        user.last_ip = client_ip
        user.last_user_agent = user_agent
        user.last_login = models.utc_now()
        user.login_method = "google"
        if google_user.picture and not user.avatar_path:
            user.avatar_path = google_user.picture
        await db.commit()
        return user

    # 3. Create new operator user
    username = f"google_{google_user.id[:8]}"
    random_password = secrets.token_urlsafe(32)

    result = await db.execute(select(models.AdminUser).where(models.AdminUser.username == username))
    if result.scalars().first():
        username = f"google_{google_user.id[:8]}_{secrets.token_hex(2)}"

    new_user = models.AdminUser(
        username=username,
        hashed_password=hash_password(random_password),
        full_name=google_user.name or normalized_email.split("@")[0],
        email=normalized_email,
        google_id=google_user.id,
        avatar_path=google_user.picture,
        role="operator",
        login_method="google",
        last_ip=client_ip,
        last_user_agent=user_agent,
        last_login=models.utc_now(),
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info("Google OAuth: Created new user: %s", new_user.username)
    return new_user


async def google_auth_redirect(request: Request) -> RedirectResponse:
    """Redirect to Google OAuth - GET /auth/google."""
    if not GOOGLE_OAUTH_ENABLED:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    client_ip = get_client_ip(request)
    state = secrets.token_urlsafe(32)
    set_ex(
        f"oauth_state:{state}",
        json.dumps({"client_ip": client_ip, "timestamp": time.time()}),
        300,
    )

    auth_url = await get_google_auth_url(state)
    logger.info("Google OAuth: Redirect initiated from %s", client_ip)
    return RedirectResponse(url=auth_url, status_code=302)


async def google_auth_callback(request: Request, db: AsyncSession) -> RedirectResponse:
    """Handle Google OAuth callback - GET /auth/google/callback."""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    if error:
        logger.warning("Google OAuth error: %s from %s", error, client_ip)
        return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)

    if not code or not state:
        logger.warning("Google OAuth missing code/state from %s", client_ip)
        return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)

    raw_state = get_del(f"oauth_state:{state}")
    if not raw_state:
        logger.warning("Google OAuth invalid state from %s", client_ip)
        return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)

    try:
        token_data = await exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)

        google_user = await get_google_user_info(access_token)
        user = await find_or_create_google_user(google_user, db, client_ip, user_agent)

        jwt_token = create_access_token(data={"sub": user.username, "role": user.role})
        exchange_code = secrets.token_urlsafe(32)
        set_ex(
            f"oauth_xchg:{exchange_code}",
            json.dumps({"token": jwt_token, "username": user.username, "timestamp": time.time()}),
            120,
        )

        response = RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard?welcome=google&code={exchange_code}",
            status_code=302,
        )
        set_auth_cookie(response, jwt_token)
        logger.info("Google OAuth: Login successful for %s from %s", user.username, client_ip)
        return response
    except Exception as e:
        logger.error("Google OAuth callback error: %s", e)
        return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)


class GoogleExchangeRequest(BaseModel):
    code: str


async def exchange_google_login_code(code: str) -> dict[str, Any]:
    """Exchange one-time OAuth login code for JWT (POST from SPA)."""
    raw = get_del(f"oauth_xchg:{code}")
    if not raw:
        raise HTTPException(status_code=400, detail="کد ورود نامعتبر یا منقضی است")
    try:
        entry = json.loads(raw)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="کد ورود نامعتبر یا منقضی است") from exc
    if time.time() - float(entry.get("timestamp", 0)) > 120:
        raise HTTPException(status_code=400, detail="کد ورود منقضی شده است")
    return {
        "access_token": entry["token"],
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }
