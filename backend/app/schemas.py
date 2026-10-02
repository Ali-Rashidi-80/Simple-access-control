from datetime import datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

# ==========================================
# 1. DATABASE/API SCHEMAS
# ==========================================


# --- User Schemas ---
class UserBase(BaseModel):
    name: str = Field(..., min_length=1, description="User name cannot be empty")
    role: str = "user"
    avatar_url: Optional[str] = None
    rfid_tag: str = Field(..., min_length=1, description="RFID tag cannot be empty")


class UserCreate(UserBase):
    """Schema for creating a new user with required RFID tag and name."""


class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


# --- Log Schemas ---
class AccessLogBase(BaseModel):
    user_name: str
    action: str  # "GRANTED" or "DENIED"
    is_duress: bool = False
    temperature: Optional[float] = None


class AccessLogCreate(AccessLogBase):
    """Schema for creating a new access log entry."""


class AccessLogResponse(AccessLogBase):
    id: int
    timestamp: datetime
    rfid_tag: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Log query with filtering
class LogQuery(BaseModel):
    skip: int = 0
    limit: int = 50
    status: Optional[Literal["success", "error", "pending", "all"]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class LogsResponse(BaseModel):
    logs: List[AccessLogResponse]
    total: int
    stats: dict


# --- Settings Schemas ---
class SettingUpdate(BaseModel):
    key: str
    value: str


class SettingsResponse(BaseModel):
    settings: dict


class BulkSettingsUpdate(BaseModel):
    settings: dict  # key-value pairs


# --- Profile Schemas ---
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


# ==========================================
# 2. WEBSOCKET PROTOCOL SCHEMAS
# ==========================================


# Message FROM Hardware (ESP32)
class HardwareMessage(BaseModel):
    type: Literal["scan", "telemetry", "ping"]
    rfid: Optional[str] = None
    temperature: Optional[float] = None  # Standardized key: 'temperature'
    is_duress: bool = False

    @model_validator(mode="before")
    @classmethod
    def alias_uid_to_rfid(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "uid" in data and not data.get("rfid"):
                data["rfid"] = data["uid"]
        return data


# Message FROM Frontend
class FrontendMessage(BaseModel):
    cmd: Literal["OPEN"]


# Message FROM Backend TO Hardware
class HardwareCommand(BaseModel):
    cmd: Literal["OPEN", "DENY", "PONG"]
    duration: int = 3


# Message FROM Backend TO Frontend
class BroadcastMessage(BaseModel):
    type: Literal["ACCESS_LOG", "UNKNOWN_TAG", "PONG", "TELEMETRY"]
    data: Optional[dict] = None  # For ACCESS_LOG and TELEMETRY
    uid: Optional[str] = None  # For UNKNOWN_TAG
    timestamp: Optional[str] = None


# ==========================================
# 3. SMS OTP SCHEMAS
# ==========================================


class SendOTPRequest(BaseModel):
    """Request to send OTP to phone number"""

    phone: str = Field(
        ...,
        min_length=10,
        max_length=15,
        pattern=r"^(?:(?:\+|00)98|0)?9\d{9}$",
        description="Iranian phone number (e.g. 0912..., +98912...)",
    )


class VerifyOTPRequest(BaseModel):
    """Request to verify OTP and login"""

    phone: str = Field(..., min_length=10, max_length=15, pattern=r"^(?:(?:\+|00)98|0)?9\d{9}$")
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$", description="6-digit OTP code")


class OTPResponse(BaseModel):
    """Response for OTP operations"""

    success: bool
    message: str
    phone_masked: Optional[str] = None  # 9123****45
    expires_in: Optional[int] = None  # seconds
