"""SQLAlchemy ORM models for SentryGate Door."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utc_now() -> datetime:
    """Naive UTC for TIMESTAMP WITHOUT TIME ZONE (Postgres + SQLite)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    """RFID/PIN door access holders."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String, index=True)
    role: Mapped[Optional[str]] = mapped_column(String, default="user")
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    rfid_tag: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    pin_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=utc_now)

    @property
    def has_pin(self) -> bool:
        """Return whether a door PIN is configured without exposing its hash."""
        return bool(self.pin_hash)


class AdminUser(Base):
    """Admin and operator users for dashboard authentication."""

    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String, default="admin")
    avatar_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    clearance_level: Mapped[Optional[int]] = mapped_column(Integer, default=5)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=utc_now)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    google_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True, index=True)
    login_method: Mapped[Optional[str]] = mapped_column(String, default="password")
    last_ip: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    last_user_agent: Mapped[Optional[str]] = mapped_column(String, nullable=True)


class AccessLog(Base):
    """Door access and denial audit trail."""

    __tablename__ = "access_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_name: Mapped[Optional[str]] = mapped_column(String)
    rfid_tag: Mapped[Optional[str]] = mapped_column(String, index=True)
    action: Mapped[Optional[str]] = mapped_column(String)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utc_now, index=True)
    is_duress: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)


class SystemSettings(Base):
    """Key-value runtime configuration stored in database."""

    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now
    )


class LoginAttempt(Base):
    """Login attempt history for brute-force rate limiting."""

    __tablename__ = "login_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[Optional[str]] = mapped_column(String, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String, index=True)
    success: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime, default=utc_now, index=True)


class MobileOTP(Base):
    """Short-lived SMS OTP records."""

    __tablename__ = "mobile_otp"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    phone: Mapped[str] = mapped_column(String, index=True, nullable=False)
    otp: Mapped[str] = mapped_column(String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    attempts: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=utc_now)
    client_ip: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String, nullable=True)


class TemporaryPin(Base):
    """Time-limited / limited-use visitor PIN (hashed)."""

    __tablename__ = "temporary_pins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code_hash: Mapped[str] = mapped_column(String, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    uses_remaining: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("admin_users.id"), nullable=True
    )
    label: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=utc_now)
