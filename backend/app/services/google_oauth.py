"""
Google OAuth Service
Handles Google OAuth 2.0 authentication with smart user identity linking.
"""

import logging
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

import httpx
from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models
from .security import create_access_token, hash_password

logger = logging.getLogger("uvicorn")

# Google OAuth Configuration from environment
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "https://rynix.ir/auth/google/callback")
GOOGLE_AUTH_URL = os.getenv("GOOGLE_AUTH_URL", "https://accounts.google.com/o/oauth2/v2/auth")
GOOGLE_TOKEN_URL = os.getenv("GOOGLE_TOKEN_URL", "https://oauth2.googleapis.com/token")
GOOGLE_USERINFO_URL = os.getenv("GOOGLE_USERINFO_URL", "https://www.googleapis.com/oauth2/v2/userinfo")

# Check if Google OAuth is configured
GOOGLE_OAUTH_ENABLED = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
if not GOOGLE_OAUTH_ENABLED:
    logger.warning("⚠️ Google OAuth not configured - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")

# State storage for CSRF protection (in production use Redis)
oauth_states: Dict[str, dict] = {}

# Token expiry
ACCESS_TOKEN_EXPIRE_MINUTES = 30


class GoogleUserInfo(BaseModel):
    """Google user info from OAuth"""

    id: str
    email: str
    name: str
    picture: Optional[str] = None
    verified_email: bool = False


def get_client_ip(request: Request) -> str:
    """Get client IP from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def get_google_auth_url(state: str) -> str:
    """Generate Google OAuth authorization URL"""
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

    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"{GOOGLE_AUTH_URL}?{query_string}"


async def exchange_code_for_token(code: str) -> dict:
    """Exchange authorization code for access token"""
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
            return response.json()
        else:
            logger.error(f"Google token exchange failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")


async def get_google_user_info(access_token: str) -> GoogleUserInfo:
    """Get user info from Google"""
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
                verified_email=data.get("verified_email", False),
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")


async def find_or_create_google_user(
    google_user: GoogleUserInfo, db: AsyncSession, client_ip: str, user_agent: str
) -> models.AdminUser:
    """
    Smart identity linking algorithm:
    1. Find by google_id
    2. Find by email
    3. Find by recent IP/UserAgent (72 hours)
    4. Create new user
    """
    normalized_email = (google_user.email or "").lower()

    # 1. Check by google_id
    result = await db.execute(
        select(models.AdminUser).where(models.AdminUser.google_id == google_user.id, models.AdminUser.is_active == True)
    )
    user = result.scalars().first()

    if user:
        logger.info(f"Google OAuth: Found user by google_id: {user.username}")
        # Update fingerprint
        user.last_ip = client_ip
        user.last_user_agent = user_agent
        user.last_login = datetime.now(timezone.utc)
        user.login_method = "google"
        await db.commit()
        return user

    # 2. Check by email
    result = await db.execute(
        select(models.AdminUser).where(models.AdminUser.email == normalized_email, models.AdminUser.is_active == True)
    )
    user = result.scalars().first()

    if user:
        logger.info(f"Google OAuth: Linking google_id to existing user by email: {user.username}")
        # Link google_id to existing user
        user.google_id = google_user.id
        user.last_ip = client_ip
        user.last_user_agent = user_agent
        user.last_login = datetime.now(timezone.utc)
        user.login_method = "google"
        if google_user.picture and not user.avatar_path:
            user.avatar_path = google_user.picture
        await db.commit()
        return user

    # 3. Check by IP/UserAgent (72 hours) - for linking when email is empty
    cutoff = datetime.now(timezone.utc) - timedelta(hours=72)
    result = await db.execute(
        select(models.AdminUser)
        .where(
            models.AdminUser.last_ip == client_ip,
            models.AdminUser.last_login > cutoff,
            models.AdminUser.is_active == True,
            or_(models.AdminUser.email == None, models.AdminUser.email == ""),
        )
        .order_by(models.AdminUser.last_login.desc())
    )
    user = result.scalars().first()

    if user:
        logger.info(f"Google OAuth: Linking google_id to user by IP fingerprint: {user.username}")
        user.google_id = google_user.id
        user.email = normalized_email
        user.last_ip = client_ip
        user.last_user_agent = user_agent
        user.last_login = datetime.now(timezone.utc)
        user.login_method = "google"
        if google_user.picture and not user.avatar_path:
            user.avatar_path = google_user.picture
        await db.commit()
        return user

    # 4. Create new user
    username = f"google_{google_user.id[:8]}"
    random_password = secrets.token_urlsafe(32)

    # Ensure unique username
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
        role="operator",  # New Google users get operator role
        login_method="google",
        last_ip=client_ip,
        last_user_agent=user_agent,
        last_login=datetime.now(timezone.utc),
        is_active=True,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(f"Google OAuth: Created new user: {new_user.username}")
    return new_user


async def google_auth_redirect(request: Request):
    """Redirect to Google OAuth - GET /auth/google"""
    if not GOOGLE_OAUTH_ENABLED:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    client_ip = get_client_ip(request)
    state = secrets.token_urlsafe(32)

    # Store state for validation
    oauth_states[state] = {"client_ip": client_ip, "timestamp": time.time()}

    # Clean old states
    current_time = time.time()
    for s in list(oauth_states.keys()):
        if current_time - oauth_states[s]["timestamp"] > 300:
            del oauth_states[s]

    auth_url = await get_google_auth_url(state)
    logger.info(f"Google OAuth: Redirect initiated from {client_ip}")

    return RedirectResponse(url=auth_url, status_code=302)


async def google_auth_callback(request: Request, db: AsyncSession):
    """Handle Google OAuth callback - GET /auth/google/callback"""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    # Check for errors
    if error:
        logger.warning(f"Google OAuth error: {error} from {client_ip}")
        return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)

    if not code or not state:
        logger.warning(f"Google OAuth missing code/state from {client_ip}")
        return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)

    # Validate state
    if state not in oauth_states:
        logger.warning(f"Google OAuth invalid state from {client_ip}")
        return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)

    state_data = oauth_states[state]

    # Check expiry (5 minutes)
    if time.time() - state_data["timestamp"] > 300:
        del oauth_states[state]
        logger.warning(f"Google OAuth expired state from {client_ip}")
        return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)

    # Remove used state
    del oauth_states[state]

    try:
        # Exchange code for token
        token_data = await exchange_code_for_token(code)
        access_token = token_data.get("access_token")

        if not access_token:
            return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)

        # Get user info
        google_user = await get_google_user_info(access_token)

        # Find or create user
        user = await find_or_create_google_user(google_user, db, client_ip, user_agent)

        # Create JWT token
        jwt_token = create_access_token(data={"sub": user.username, "role": user.role})

        # Redirect to frontend with token in URL (cookies won't work cross-domain)
        FRONTEND_URL = os.getenv("FRONTEND_URL", "https://rash32.ir")
        response = RedirectResponse(url=f"{FRONTEND_URL}/dashboard?welcome=google&token={jwt_token}", status_code=302)

        # We still set cookie as backup/for same-domain usage
        response.set_cookie(
            key="access_token",
            value=jwt_token,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/",
        )

        logger.info(f"Google OAuth: Login successful for {user.username} from {client_ip}")
        return response

    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}")
        return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)
