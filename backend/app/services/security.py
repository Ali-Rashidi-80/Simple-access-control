"""Security Service - JWT, Password Hashing, Rate Limiting, Hygiene & Scheduled Cleanup."""

from __future__ import annotations

import gzip
import logging
import os
import re
import shutil
import subprocess
from datetime import datetime, timedelta, timezone
from logging.handlers import RotatingFileHandler
from typing import Any, Optional, cast

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import delete, func, select
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models

logger = logging.getLogger("uvicorn")

# --- Configuration ---
DEFAULT_INSECURE_JWT_SECRET = "sentrygate-super-secret-key-change-in-production"
SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY") or DEFAULT_INSECURE_JWT_SECRET
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
RATE_LIMIT_ATTEMPTS = 5
RATE_LIMIT_WINDOW_MINUTES = 15
LOG_RETENTION_DAYS = 90
LOGIN_ATTEMPT_RETENTION_DAYS = 7
TEMP_PIN_RETENTION_DAYS = 7
BACKUP_DIR = os.getenv("BACKUP_DIR", "./data/backups")
DATABASE_PATH = os.getenv("DATABASE_PATH", "./sql_app.db")

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def setup_logging() -> None:
    """Attach a 5MB x 3 rotating file handler at LOG_DIR/backend.log once."""
    log_dir = os.getenv("LOG_DIR", "./data/logs")
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.abspath(os.path.join(log_dir, "backend.log"))
    target_logger = logging.getLogger("uvicorn")
    for existing in target_logger.handlers:
        if (
            isinstance(existing, RotatingFileHandler)
            and os.path.abspath(getattr(existing, "baseFilename", "")) == log_path
        ):
            return
    handler = RotatingFileHandler(
        log_path,
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    target_logger.addHandler(handler)


def check_secret_hygiene() -> list[str]:
    """Warn on weak or placeholder production secrets."""
    issues: list[str] = []
    jwt_secret = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY") or SECRET_KEY
    if jwt_secret == DEFAULT_INSECURE_JWT_SECRET or len(jwt_secret) < 16:
        issues.append("JWT_SECRET_KEY is using a default or short value")

    pin_pepper = os.getenv("PIN_PEPPER", "change-me-pin-pepper")
    if pin_pepper.startswith("change-me") or len(pin_pepper) < 12:
        issues.append("PIN_PEPPER is using a default or short value")

    hw_token = os.getenv("HARDWARE_TOKEN", "")
    if not hw_token or hw_token.startswith("change-me") or len(hw_token) < 12:
        issues.append("HARDWARE_TOKEN is unset, default, or too short")

    debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
    skip_dotenv = os.getenv("SKIP_DOTENV", "").lower() in ("1", "true", "yes")
    if issues and not debug_mode and not skip_dotenv:
        for issue in issues:
            logger.critical("SECURITY HYGIENE WARNING: %s", issue)
    elif issues:
        for issue in issues:
            logger.warning("Secret hygiene notice: %s", issue)
    return issues


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bool(pwd_context.verify(plain_password, hashed_password))


def hash_password(password: str) -> str:
    """Hash a password for storage."""
    return str(pwd_context.hash(password))


# --- JWT Token Management ---
def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return str(jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM))


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return dict(payload)
    except JWTError as e:
        logger.warning("JWT decode error: %s", e)
        return None


# --- Rate Limiting ---
def _utc_naive() -> datetime:
    """Postgres TIMESTAMP WITHOUT TIME ZONE expects naive UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class RateLimiter:
    """Rate limiting service for login attempts."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_attempt(self, username: str, ip_address: str, success: bool) -> None:
        """Record a login attempt."""
        attempt = models.LoginAttempt(
            username=username,
            ip_address=ip_address,
            success=success,
            timestamp=_utc_naive(),
        )
        self.db.add(attempt)
        await self.db.commit()

    async def is_rate_limited(self, username: str, ip_address: str) -> tuple[bool, int]:
        """Check if user/IP is rate limited. Returns (is_limited, seconds_until_reset)."""
        window_start = _utc_naive() - timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)

        result = await self.db.execute(
            select(func.count(models.LoginAttempt.id)).where(
                models.LoginAttempt.timestamp >= window_start,
                models.LoginAttempt.success == False,  # noqa: E712
                (models.LoginAttempt.username == username)
                | (models.LoginAttempt.ip_address == ip_address),
            )
        )
        failed_count = result.scalar() or 0

        if failed_count >= RATE_LIMIT_ATTEMPTS:
            oldest_result = await self.db.execute(
                select(models.LoginAttempt.timestamp)
                .where(
                    models.LoginAttempt.timestamp >= window_start,
                    models.LoginAttempt.success == False,  # noqa: E712
                )
                .order_by(models.LoginAttempt.timestamp.asc())
                .limit(1)
            )
            oldest = oldest_result.scalar()
            if oldest:
                reset_time = oldest + timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)
                seconds_remaining = int((reset_time - _utc_naive()).total_seconds())
                return True, max(0, seconds_remaining)

        return False, 0

    async def clear_old_attempts(self) -> None:
        """Clean up old login attempts (older than double rate-limit window)."""
        cutoff = _utc_naive() - timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES * 2)
        await self.db.execute(
            delete(models.LoginAttempt).where(models.LoginAttempt.timestamp < cutoff)
        )
        await self.db.commit()


# --- Input Sanitization ---
def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS attacks."""
    if not text:
        return text
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )


def validate_username(username: str) -> bool:
    """Validate username format (alphanumeric + underscore only)."""
    return bool(re.match(r"^[a-zA-Z0-9_]{3,30}$", username))


# --- Database Backup System ---
def create_backup() -> None:
    """Create a compressed DB backup (pg_dump for Postgres, gzip file for SQLite)."""
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        database_url = os.getenv("DATABASE_URL", "") or ""

        if "postgresql" in database_url or "postgres" in database_url:
            backup_name = f"backup_{timestamp}.sql.gz"
            backup_path = os.path.join(BACKUP_DIR, backup_name)
            dsn = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
            env = os.environ.copy()
            proc = subprocess.run(
                ["pg_dump", dsn],
                capture_output=True,
                env=env,
                check=False,
            )
            if proc.returncode != 0:
                logger.error("pg_dump failed: %s", (proc.stderr or b"")[:500])
                return
            with gzip.open(backup_path, "wb") as f_out:
                f_out.write(proc.stdout)
            logger.info("Postgres backup created: %s", backup_path)
            rotate_backups(keep_count=4, suffix=".sql.gz")
            return

        backup_name = f"backup_{timestamp}.db.gz"
        backup_path = os.path.join(BACKUP_DIR, backup_name)
        with open(DATABASE_PATH, "rb") as f_in:
            with gzip.open(backup_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)
        logger.info("SQLite backup created: %s", backup_path)
        rotate_backups(keep_count=4, suffix=".db.gz")
    except Exception as e:
        logger.error("Backup failed: %s", e)


def rotate_backups(keep_count: int = 4, suffix: str = ".gz") -> None:
    """Keep only the most recent backups."""
    try:
        if not os.path.exists(BACKUP_DIR):
            return
        backups = sorted(
            [f for f in os.listdir(BACKUP_DIR) if f.startswith("backup_") and f.endswith(suffix)],
            reverse=True,
        )
        for old_backup in backups[keep_count:]:
            os.remove(os.path.join(BACKUP_DIR, old_backup))
            logger.info("Deleted old backup: %s", old_backup)
    except Exception as e:
        logger.error("Backup rotation failed: %s", e)


async def cleanup_old_logs(db: AsyncSession) -> None:
    """Delete aged access logs (>90d), login attempts (>7d), expired OTPs, and old temp pins."""
    try:
        now = _utc_naive()
        log_cutoff = now - timedelta(days=LOG_RETENTION_DAYS)
        attempt_cutoff = now - timedelta(days=LOGIN_ATTEMPT_RETENTION_DAYS)
        pin_cutoff = now - timedelta(days=TEMP_PIN_RETENTION_DAYS)

        res_logs = await db.execute(
            delete(models.AccessLog).where(models.AccessLog.timestamp < log_cutoff)
        )
        res_attempts = await db.execute(
            delete(models.LoginAttempt).where(models.LoginAttempt.timestamp < attempt_cutoff)
        )
        res_otps = await db.execute(
            delete(models.MobileOTP).where(models.MobileOTP.expires_at < now)
        )
        res_pins = await db.execute(
            delete(models.TemporaryPin).where(models.TemporaryPin.expires_at < pin_cutoff)
        )
        await db.commit()
        logger.info(
            "Daily cleanup: logs=%s attempts=%s otps=%s temp_pins=%s",
            cast(CursorResult[Any], res_logs).rowcount,
            cast(CursorResult[Any], res_attempts).rowcount,
            cast(CursorResult[Any], res_otps).rowcount,
            cast(CursorResult[Any], res_pins).rowcount,
        )
    except Exception as e:
        await db.rollback()
        logger.error("Log cleanup failed: %s", e)


async def run_daily_cleanup() -> None:
    """Async scheduler callback opening its own DB session for daily cleanup."""
    from ..database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await cleanup_old_logs(db)


# --- Scheduler Setup ---
scheduler = AsyncIOScheduler()


def setup_scheduled_tasks() -> None:
    """Setup weekly backup and daily data-retention cleanup jobs."""
    scheduler.add_job(
        create_backup,
        "cron",
        day_of_week="sun",
        hour=3,
        minute=0,
        id="weekly_backup",
        replace_existing=True,
    )
    scheduler.add_job(
        run_daily_cleanup,
        "cron",
        hour=4,
        minute=0,
        id="daily_cleanup",
        replace_existing=True,
    )
    logger.info("Scheduled tasks configured: Weekly backup (Sun 3AM) + Daily cleanup (4AM)")
