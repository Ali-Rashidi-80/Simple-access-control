from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

# ==========================================
# 1. DATABASE/API SCHEMAS
# ==========================================

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    role: str = "user"
    avatar_url: Optional[str] = None
    rfid_tag: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool = True # Added as it was seen in UserData frontend interface

    class Config:
        from_attributes = True

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
    rfid: Optional[str] = None

    class Config:
        from_attributes = True

# ==========================================
# 2. WEBSOCKET PROTOCOL SCHEMAS
# ==========================================

# Message FROM Hardware (ESP32)
class HardwareMessage(BaseModel):
    type: Literal["scan", "telemetry"]
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
    type: Literal["ACCESS_LOG", "UNKNOWN_TAG", "PONG"]
    data: Optional[dict] = None # For ACCESS_LOG
    uid: Optional[str] = None # For UNKNOWN_TAG
    timestamp: Optional[str] = None
