from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text

from .database import Base


def utc_now():
    """Return current UTC time as timezone-aware datetime"""
    return datetime.now(timezone.utc)


class User(Base):
    """RFID-based users for door access"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    role = Column(String, default="user")  # 'admin' or 'user'
    avatar_url = Column(String, nullable=True)
    rfid_tag = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=utc_now)


class AdminUser(Base):
    """Admin users for dashboard login authentication"""

    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(String, default="admin")  # 'admin' or 'operator'
    avatar_path = Column(String, nullable=True)
    clearance_level = Column(Integer, default=5)
    created_at = Column(DateTime, default=utc_now)
    last_login = Column(DateTime, nullable=True, index=True)
    is_active = Column(Boolean, default=True)

    # 🆕 Identity linking fields for Google OAuth / SMS OTP
    google_id = Column(String, unique=True, nullable=True, index=True)
    phone = Column(String, unique=True, nullable=True, index=True)
    login_method = Column(String, default="password")  # password, google, sms

    # 🆕 Fingerprinting for smart identity detection
    last_ip = Column(String, nullable=True, index=True)
    last_user_agent = Column(String, nullable=True)


class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String)  # Denormalized for easier querying if user is deleted
    rfid_tag = Column(String, index=True)
    action = Column(String)  # GRANTED, DENIED
    timestamp = Column(DateTime, default=utc_now, index=True)
    is_duress = Column(Boolean, default=False)
    temperature = Column(Float, nullable=True)


class SystemSettings(Base):
    """Persistent system settings"""

    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class LoginAttempt(Base):
    """Track login attempts for rate limiting"""

    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    ip_address = Column(String, index=True)
    success = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=utc_now, index=True)


class MobileOTP(Base):
    """SMS OTP storage with rate limiting"""

    __tablename__ = "mobile_otp"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True, nullable=False)
    otp = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)
    client_ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
