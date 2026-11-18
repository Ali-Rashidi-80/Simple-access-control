"""Pydantic request, response, and WebSocket protocol schemas."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

_IRAN_PHONE_RE = re.compile(r"^(?:(?:\+|00)98|0)?9\d{9}$")


def _to_naive_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


# ==========================================
# 1. DATABASE/API SCHEMAS
# ==========================================


class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="User name cannot be empty")
    role: str = Field(default="user", min_length=1, max_length=64)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    rfid_tag: str = Field(..., min_length=1, max_length=128, description="RFID tag cannot be empty")

    @field_validator("name", "role", "rfid_tag")
    @classmethod
    def _strip_non_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or whitespace")
        return cleaned


class UserCreate(UserBase):
    expires_at: Optional[datetime] = None

    @field_validator("expires_at")
    @classmethod
    def _normalize_expires_at(cls, v: Optional[datetime]) -> Optional[datetime]:
        return _to_naive_utc(v)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    role: Optional[str] = Field(default=None, min_length=1, max_length=64)
    rfid_tag: Optional[str] = Field(default=None, min_length=1, max_length=128)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None

    @field_validator("name", "role", "rfid_tag")
    @classmethod
    def _strip_optional_non_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or whitespace")
        return cleaned

    @field_validator("expires_at")
    @classmethod
    def _normalize_expires_at(cls, v: Optional[datetime]) -> Optional[datetime]:
        return _to_naive_utc(v)


class UserResponse(BaseModel):
    id: int
    name: str
    role: str = "user"
    avatar_url: Optional[str] = None
    rfid_tag: Optional[str] = None
    created_at: datetime
    is_active: bool = True
    expires_at: Optional[datetime] = None
    has_pin: bool = False

    model_config = ConfigDict(from_attributes=True)


# --- Log Schemas ---


class AccessLogBase(BaseModel):
    user_name: str
    action: str
    is_duress: bool = False
    temperature: Optional[float] = None


class AccessLogCreate(AccessLogBase):
    pass


class AccessLogResponse(AccessLogBase):
    id: int
    timestamp: datetime
    rfid_tag: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LogQuery(BaseModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=50, ge=1, le=200)
    status: Optional[Literal["success", "error", "pending", "all"]] = None
    q: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class LogsResponse(BaseModel):
    logs: List[AccessLogResponse]
    total: int
    stats: dict[str, int]


# --- Settings Schemas ---


class SettingUpdate(BaseModel):
    key: str
    value: str


class SettingsResponse(BaseModel):
    settings: dict[str, Any]


class BulkSettingsUpdate(BaseModel):
    settings: dict[str, Any]

    @field_validator("settings")
    @classmethod
    def _validate_settings(cls, value: dict[str, Any]) -> dict[str, Any]:
        if len(value) > 100:
            raise ValueError("Too many settings keys")
        for key, raw_val in value.items():
            if not isinstance(key, str) or not key.strip() or len(key) > 64:
                raise ValueError("Invalid setting key")
            if key in ("auto_lock_start", "auto_lock_end"):
                if raw_val is None or str(raw_val).strip() == "":
                    continue
                if isinstance(raw_val, bool):
                    raise ValueError(f"{key} must be an integer between 0 and 23")
                try:
                    hour = int(str(raw_val).strip())
                except ValueError as exc:
                    raise ValueError(f"{key} must be an integer between 0 and 23") from exc
                if hour < 0 or hour > 23:
                    raise ValueError(f"{key} must be between 0 and 23")
            elif key == "timer_duration":
                if raw_val is None or str(raw_val).strip() == "":
                    continue
                if isinstance(raw_val, bool):
                    raise ValueError("timer_duration must be an integer between 1 and 60")
                try:
                    duration = int(str(raw_val).strip())
                except ValueError as exc:
                    raise ValueError("timer_duration must be an integer between 1 and 60") from exc
                if duration < 1 or duration > 60:
                    raise ValueError("timer_duration must be between 1 and 60")
            elif key == "alert_phone":
                if raw_val is None:
                    continue
                phone = str(raw_val).strip()
                if phone and not _IRAN_PHONE_RE.match(phone):
                    raise ValueError("alert_phone must be empty or a valid Iranian mobile number")
        return value


# --- Profile Schemas ---


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


# ==========================================
# 2. WEBSOCKET & HARDWARE PROTOCOL SCHEMAS
# ==========================================


class HardwareMessage(BaseModel):
    type: Literal["scan", "telemetry", "ping", "status", "ACK"]
    rfid: Optional[str] = None
    temperature: Optional[float] = None
    is_duress: bool = False
    device_role: Optional[str] = None
    device_id: Optional[str] = None
    action: Optional[str] = None
    command_id: Optional[str] = None
    cmd: Optional[str] = None
    status: Optional[str] = None
    reason: Optional[str] = None
    local_decision: Optional[Literal["GRANTED", "DENIED"]] = None


class FrontendMessage(BaseModel):
    cmd: Literal["OPEN"]


class HardwareCommand(BaseModel):
    cmd: Literal["OPEN", "DENY", "ALLOWLIST_INVALIDATE"]
    duration: int = Field(default=3, ge=1, le=60)
    command_id: Optional[str] = None


class BroadcastMessage(BaseModel):
    type: Literal["ACCESS_LOG", "UNKNOWN_TAG", "PONG", "TELEMETRY", "STATUS"]
    data: Optional[dict[str, Any]] = None
    uid: Optional[str] = None
    timestamp: Optional[str] = None


class HardwareEventItem(BaseModel):
    event_id: Optional[str] = Field(default=None, max_length=128)
    type: str = Field(..., min_length=1, max_length=64)
    rfid: Optional[str] = Field(default=None, max_length=128)
    channel: Optional[str] = Field(default=None, max_length=64)
    action: Optional[str] = Field(default=None, max_length=32)
    user_name: Optional[str] = Field(default=None, max_length=120)
    is_duress: bool = False
    temperature: Optional[float] = None
    pin_hash: Optional[str] = Field(default=None, max_length=128)


class HardwareEventsPayload(BaseModel):
    events: List[HardwareEventItem] = Field(default_factory=list, max_length=100)


# ==========================================
# 3. SMS OTP SCHEMAS
# ==========================================


class SendOTPRequest(BaseModel):
    """Request to send OTP to phone number."""

    phone: str = Field(
        ...,
        min_length=10,
        max_length=15,
        pattern=r"^(?:(?:\+|00)98|0)?9\d{9}$",
        description="Iranian phone number (e.g. 0912..., +98912...)",
    )


class VerifyOTPRequest(BaseModel):
    """Request to verify OTP and login."""

    phone: str = Field(
        ...,
        min_length=10,
        max_length=15,
        pattern=r"^(?:(?:\+|00)98|0)?9\d{9}$",
    )
    otp: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-digit OTP code",
    )


class OTPResponse(BaseModel):
    """Response for OTP operations."""

    success: bool
    message: str
    phone_masked: Optional[str] = None
    expires_in: Optional[int] = None
