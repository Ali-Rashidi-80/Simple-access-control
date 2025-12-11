from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text
from datetime import datetime, timezone
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
    last_login = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)


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
