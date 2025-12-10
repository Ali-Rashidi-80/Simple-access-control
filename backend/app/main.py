from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
import logging
from contextlib import asynccontextmanager

from .database import engine, Base, get_db
from . import models, schemas
from .services.processor import manager

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

# --- Lifespan Manager (Startup/Shutdown) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    try:
        async with engine.begin() as conn:
            # await conn.run_sync(Base.metadata.drop_all) # UNCOMMENT TO RESET DB
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified.")
    except Exception as e:
        logger.error(f"Database Connection Failed at Startup: {e}")
        # Continue startup so the app binds to port (allows 500 responses instead of 502 timeout)
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(title="SentryGate IoT API", lifespan=lifespan)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://sentry-frontend.chbk.app",
        "http://sentry-frontend.chbk.app",
        "https://rash32.ir",
        "http://rash32.ir",
        "*" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. WEBSOCKET ROUTER
# ==========================================
@app.websocket("/ws/{client_type}")
async def websocket_endpoint(websocket: WebSocket, client_type: str):
    """
    Unified WebSocket Endpoint.
    client_type: 'frontend' or 'hardware'
    """
    if client_type not in ["frontend", "hardware"]:
        await websocket.close(code=4000)
        return

    await manager.connect(websocket, client_type)
    
    # Get a fresh DB session for this connection's lifespan? 
    # Or create one per message? Creating one per message is safer for long-lived WS.
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Process strictly based on client type
            async with AsyncSession(engine) as session: # Manual session creation for WS loop
                 if client_type == "hardware":
                     await manager.process_hardware_message(data, session)
                 elif client_type == "frontend":
                     await manager.process_frontend_message(data, session)
                     
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_type)
    except Exception as e:
        logger.error(f"WebSocket Error ({client_type}): {e}")
        # Try to close gracefully before disconnecting
        try:
            await websocket.close()
        except:
            pass
        manager.disconnect(websocket, client_type)

# ==========================================
# 2. REST API (Users)
# ==========================================
@app.post("/users/", response_model=schemas.UserResponse)
async def create_user(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    # Check existing
    result = await db.execute(select(models.User).where(models.User.rfid_tag == user.rfid_tag))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="RFID Tag already registered")
    
    db_user = models.User(
        name=user.name,
        role=user.role,
        avatar_url=user.avatar_url,
        rfid_tag=user.rfid_tag
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@app.get("/users/", response_model=List[schemas.UserResponse])
async def read_users(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).offset(skip).limit(limit))
    return result.scalars().all()

@app.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.delete(user)
    await db.commit()
    return {"ok": True}

# ==========================================
# 3. REST API (Logs)
# ==========================================
@app.get("/logs/", response_model=List[schemas.AccessLogResponse])
async def read_logs(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    # Order by timestamp desc
    result = await db.execute(
        select(models.AccessLog).order_by(models.AccessLog.timestamp.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()

@app.get("/")
async def root():
    return {"message": "SentryGate IoT Backend is Online 🚀"}

# ==========================================
# 4. DEBUG ENDPOINTS
# ==========================================
@app.post("/api/debug/simulate-scan")
async def simulate_scan(payload: schemas.HardwareMessage, db: AsyncSession = Depends(get_db)):
    """
    Simulate a hardware scan event for testing.
    """
    # Use model_dump for Pydantic v2, fallback to dict if needed
    data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    await manager.process_hardware_message(data, db)
    return {"ok": True}
