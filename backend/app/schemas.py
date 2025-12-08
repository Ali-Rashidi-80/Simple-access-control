from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

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

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True

# --- WebSocket Schemas (Optional helper) ---
class HardwareMessage(BaseModel):
    type: str  # e.g., "scan"
    rfid: str
    temperature: Optional[float] = None
    is_duress: bool = False
