from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    role = Column(String, default="user")  # 'admin' or 'user'
    avatar_url = Column(String, nullable=True)
    rfid_tag = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String)  # Denormalized for easier querying if user is deleted, or unknown
    rfid_tag = Column(String, index=True) # Added to track which tag caused the log
    action = Column(String)  # GRANTED, DENIED
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_duress = Column(Boolean, default=False)
    temperature = Column(Float, nullable=True)
