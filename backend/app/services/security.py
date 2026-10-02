"""
Security Service - JWT, Password Hashing, Rate Limiting
"""

import gzip
import logging
import os
import shutil
from datetime import datetime, timedelta, timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models

logger = logging.getLogger("uvicorn")

# --- Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "sentrygate-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
RATE_LIMIT_ATTEMPTS = 5
RATE_LIMIT_WINDOW_MINUTES = 15
LOG_RETENTION_DAYS = 90
BACKUP_DIR = os.getenv("BACKUP_DIR", "./data/backups")
DATABASE_PATH = os.getenv("DATABASE_PATH", "./sql_app.db")

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a password for storage"""
    return pwd_context.hash(password)


# --- JWT Token Management ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        return None


# --- Rate Limiting ---
class RateLimiter:
    """Rate limiting service for login attempts"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_attempt(self, username: str, ip_address: str, success: bool):
        """Record a login attempt"""
        attempt = models.LoginAttempt(
            username=username, ip_address=ip_address, success=success, timestamp=datetime.now(timezone.utc)
        )
        self.db.add(attempt)
        await self.db.commit()

    async def is_rate_limited(self, username: str, ip_address: str) -> tuple[bool, int]:
        """
        Check if user/IP is rate limited
        Returns: (is_limited, seconds_until_reset)
        """
        window_start = datetime.now(timezone.utc) - timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)

        # Count failed attempts by username OR IP
        result = await self.db.execute(
            select(func.count(models.LoginAttempt.id)).where(
                models.LoginAttempt.timestamp >= window_start,
                models.LoginAttempt.success == False,
                (models.LoginAttempt.username == username) | (models.LoginAttempt.ip_address == ip_address),
            )
        )
        failed_count = result.scalar() or 0

        if failed_count >= RATE_LIMIT_ATTEMPTS:
            # Find oldest attempt in window to calculate reset time
            oldest_result = await self.db.execute(
                select(models.LoginAttempt.timestamp)
                .where(models.LoginAttempt.timestamp >= window_start, models.LoginAttempt.success == False)
                .order_by(models.LoginAttempt.timestamp.asc())
                .limit(1)
            )
            oldest = oldest_result.scalar()
            if oldest:
                reset_time = oldest + timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)
                seconds_remaining = int((reset_time - datetime.now(timezone.utc).replace(tzinfo=None)).total_seconds())
                return True, max(0, seconds_remaining)

        return False, 0

    async def clear_old_attempts(self):
        """Clean up old login attempts (older than window)"""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES * 2)
        await self.db.execute(delete(models.LoginAttempt).where(models.LoginAttempt.timestamp < cutoff))
        await self.db.commit()


# --- Input Sanitization ---
def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS attacks"""
    if not text:
        return text
    # Basic HTML entity encoding
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )


def validate_username(username: str) -> bool:
    """Validate username format (alphanumeric + underscore only)"""
    import re

    return bool(re.match(r"^[a-zA-Z0-9_]{3,30}$", username))


# --- Database Backup System ---
def create_backup():
    """Create a compressed backup of the database"""
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{timestamp}.db.gz"
        backup_path = os.path.join(BACKUP_DIR, backup_name)

        # Compress and copy database
        with open(DATABASE_PATH, "rb") as f_in:
            with gzip.open(backup_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)

        logger.info(f"Database backup created: {backup_path}")

        # Rotate backups (keep last 4 weekly = ~1 month)
        rotate_backups(keep_count=4)

    except Exception as e:
        logger.error(f"Backup failed: {e}")


def rotate_backups(keep_count: int = 4):
    """Keep only the most recent backups"""
    try:
        if not os.path.exists(BACKUP_DIR):
            return

        backups = sorted(
            [f for f in os.listdir(BACKUP_DIR) if f.startswith("backup_") and f.endswith(".db.gz")], reverse=True
        )

        for old_backup in backups[keep_count:]:
            os.remove(os.path.join(BACKUP_DIR, old_backup))
            logger.info(f"Deleted old backup: {old_backup}")

    except Exception as e:
        logger.error(f"Backup rotation failed: {e}")


async def cleanup_old_logs(db: AsyncSession):
    """Delete logs older than retention period"""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=LOG_RETENTION_DAYS)
        result = await db.execute(delete(models.AccessLog).where(models.AccessLog.timestamp < cutoff))
        await db.commit()
        logger.info(f"Cleaned up {result.rowcount} old access logs")
    except Exception as e:
        logger.error(f"Log cleanup failed: {e}")


# --- Scheduler Setup ---
scheduler = AsyncIOScheduler()


def setup_scheduled_tasks():
    """Setup weekly backup and daily log cleanup"""
    # Weekly backup on Sunday at 3 AM
    scheduler.add_job(create_backup, "cron", day_of_week="sun", hour=3, minute=0)

    logger.info("Scheduled tasks configured: Weekly backup (Sunday 3AM)")
