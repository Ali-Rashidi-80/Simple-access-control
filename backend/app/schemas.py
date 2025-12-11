from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal, List
from datetime import datetime

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
    pass

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
    pass

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
    temperature: Optional[float] = None # Standardized key: 'temperature'
    is_duress: bool = False

# Message FROM Frontend
class FrontendMessage(BaseModel):
    cmd: Literal["OPEN"]

# Message FROM Backend TO Hardware
class HardwareCommand(BaseModel):
    cmd: Literal["OPEN", "DENY"]
    duration: int = 3

# Message FROM Backend TO Frontend
class BroadcastMessage(BaseModel):
    type: Literal["ACCESS_LOG", "UNKNOWN_TAG", "PONG", "TELEMETRY"]
    data: Optional[dict] = None # For ACCESS_LOG and TELEMETRY
    uid: Optional[str] = None # For UNKNOWN_TAG
    timestamp: Optional[str] = None

