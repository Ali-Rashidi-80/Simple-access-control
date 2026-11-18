"""Shared auth dependencies: cookie/Bearer JWT, CSRF Origin, RBAC, Idempotency."""

from __future__ import annotations

import hashlib
import json
import os
from typing import Any, Callable, Optional, Sequence
from urllib.parse import urlsplit

from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models
from ..database import get_db
from . import redis_store
from .security import decode_access_token

COOKIE_NAME = "sg_access"
security = HTTPBearer(auto_error=False)

TRUSTED_PROXY_IPS = {
    x.strip() for x in os.getenv("TRUSTED_PROXY_IPS", "127.0.0.1,::1").split(",") if x.strip()
}


def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if raw:
        origins = [o.strip() for o in raw.split(",") if o.strip()]
    else:
        origins = [
            "http://localhost:3100",
            "http://127.0.0.1:3100",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    frontend = os.getenv("FRONTEND_URL", "").strip()
    if frontend and frontend not in origins:
        origins.append(frontend)
    return origins


def _parse_origin(raw_url: str) -> Optional[tuple[str, str]]:
    try:
        parts = urlsplit(raw_url.strip())
    except ValueError:
        return None
    scheme = parts.scheme.lower()
    netloc = parts.netloc.lower()
    if scheme not in ("http", "https") or not netloc:
        return None
    try:
        _ = parts.port
    except ValueError:
        return None
    return (scheme, netloc)


def get_client_ip(request: Request) -> str:
    peer = request.client.host if request.client else "unknown"
    trusted = {
        x.strip()
        for x in os.getenv("TRUSTED_PROXY_IPS", ",".join(TRUSTED_PROXY_IPS)).split(",")
        if x.strip()
    }
    if peer in trusted:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return peer


def enforce_csrf(request: Request) -> None:
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    raw_origin = request.headers.get("Origin") or request.headers.get("Referer") or ""
    if not raw_origin:
        # same-origin non-browser clients / curl without Origin
        return
    parsed = _parse_origin(raw_origin)
    allowed = {o for o in (_parse_origin(a) for a in cors_origins()) if o is not None}
    if parsed is not None and parsed in allowed:
        return
    raise HTTPException(status_code=403, detail="Origin غیرمجاز")


def check_and_lock_idempotency(
    scope: str,
    key: Optional[str],
    actor_id: Optional[int] = None,
) -> tuple[Optional[Any], Optional[str]]:
    """
    Validate and acquire an atomic lock for an Idempotency-Key header.
    Returns (cached_body, lock_redis_key):
      - If cached_body is not None, replay cached_body immediately.
      - If lock_redis_key is not None, caller owns the lock and must call
        store_idempotency_result(...) on success or release_idempotency_lock(...) on error.
    """
    if not key or not key.strip():
        return None, None
    cleaned = key.strip()
    if len(cleaned) > 128:
        raise HTTPException(status_code=400, detail="کلید هم‌ارزی نامعتبر است")
    digest = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()[:32]
    redis_key = f"idem:{scope}:{actor_id if actor_id is not None else 0}:{digest}"

    pending_payload = json.dumps({"status": "pending"})
    if redis_store.set_nx_ex(redis_key, pending_payload, 60):
        return None, redis_key

    raw = redis_store.get(redis_key)
    if raw:
        try:
            entry = json.loads(raw)
        except ValueError:
            entry = {}
        if entry.get("status") == "done":
            return entry.get("body"), None
        raise HTTPException(status_code=409, detail="درخواست تکراری در حال پردازش است")

    if redis_store.set_nx_ex(redis_key, pending_payload, 60):
        return None, redis_key
    raise HTTPException(status_code=409, detail="درخواست تکراری در حال پردازش است")


def store_idempotency_result(
    redis_key: Optional[str],
    body: Any,
    ttl_seconds: int = 86400,
) -> None:
    if not redis_key:
        return
    payload = json.dumps({"status": "done", "body": jsonable_encoder(body)})
    redis_store.set_ex(redis_key, payload, ttl_seconds)


def release_idempotency_lock(redis_key: Optional[str]) -> None:
    if not redis_key:
        return
    redis_store.delete(redis_key)


def extract_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = None,
    sg_access: Optional[str] = None,
) -> Optional[str]:
    if sg_access:
        return sg_access
    if credentials and credentials.credentials:
        return credentials.credentials
    auth = request.headers.get("Authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    sg_access: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> models.AdminUser:
    enforce_csrf(request)
    token = extract_token(request, credentials, sg_access)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نشست شما منقضی شده است. لطفا دوباره وارد شوید.",
        )
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="توکن نامعتبر است")
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="توکن معتبر نیست")
    result = await db.execute(
        select(models.AdminUser).where(
            models.AdminUser.username == username,
            models.AdminUser.is_active == True,  # noqa: E712
        )
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="کاربر یافت نشد یا غیرفعال است",
        )
    return user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    sg_access: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> Optional[models.AdminUser]:
    token = extract_token(request, credentials, sg_access)
    if not token:
        return None
    try:
        return await get_current_user(request, credentials, sg_access, db)
    except HTTPException:
        return None


def require_roles(*roles: str) -> Callable[..., Any]:
    allowed: Sequence[str] = roles

    async def _dep(user: models.AdminUser = Depends(get_current_user)) -> models.AdminUser:
        if user.role not in allowed:
            raise HTTPException(status_code=403, detail="دسترسی مجاز نیست")
        return user

    return _dep


def set_auth_cookie(response: Any, token: str) -> None:
    secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=secure,
        path="/",
        max_age=1800,
    )


def clear_auth_cookie(response: Any) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")
