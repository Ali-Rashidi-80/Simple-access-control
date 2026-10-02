import asyncio
import logging
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

# Load environment variables
# Check multiple locations for .env:
# 1. Project Root (Development: Sentrygateuiuxdesign/.env)
# 2. Backend Root (Docker: /app/.env)
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(backend_dir)  # 2 levels up

env_paths = [
    os.path.join(project_root, ".env"),  # Dev: D:\...\Sentrygateuiuxdesign\.env
    os.path.join(backend_dir, ".env"),  # Docker: /app/.env
    os.path.join(current_dir, ".env"),  # Fallback
]

env_loaded = False
for path in env_paths:
    if os.path.exists(path):
        print(f"Loading .env from: {path}")
        load_dotenv(path)
        env_loaded = True
        break

if not env_loaded:
    print("WARNING: No .env file found in search paths.")

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional

from . import models, schemas
from .database import AsyncSessionLocal, Base, engine, get_db
from .services.auth_router import get_current_user
from .services.auth_router import router as auth_router
from .services.processor import manager
from .services.security import cleanup_old_logs, create_backup, hash_password, scheduler, setup_scheduled_tasks

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

# --- CORS Configuration ---
# Explicitly allowing frontend domains
origins = [
    "https://rash32.ir",
    "https://rynix.ir",
    "https://www.rash32.ir",
    "http://localhost:5173",
    "http://localhost:3000",
]
logger.info(f"CORS Policy applied for origins: {origins}")

# --- File Upload Directories ---
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)


async def seed_default_admin(db: AsyncSession):
    """Create default admin user if not exists"""
    result = await db.execute(select(models.AdminUser).where(models.AdminUser.username == "admin"))
    existing = result.scalars().first()

    if not existing:
        admin = models.AdminUser(
            username="admin",
            hashed_password=hash_password("admin123"),
            full_name="مدیر سیستم",
            email="admin@sentry.local",
            role="admin",
            clearance_level=5,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        logger.info("✅ Default admin user created: admin / admin123")
    else:
        logger.info("Admin user already exists")


async def seed_default_settings(db: AsyncSession):
    """Create default settings if not exists"""
    defaults = {
        "theme": "neon",
        "language": "fa",
        "auto_lock_start": "22",
        "auto_lock_end": "6",
        "timer_duration": "5",
        "require_biometric": "false",
        "duress_mode": "false",
    }

    for key, value in defaults.items():
        result = await db.execute(select(models.SystemSettings).where(models.SystemSettings.key == key))
        if not result.scalars().first():
            db.add(models.SystemSettings(key=key, value=value))

    await db.commit()
    logger.info("✅ Default settings initialized")


# --- Lifespan Manager (Startup/Shutdown) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and seed data
    # Create tables (Retry logic)
    max_retries = 10
    retry_interval = 5  # seconds

    logger.info(f"Connecting to database at... {os.getenv('DATABASE_URL', 'UNKNOWN').split('@')[-1]}")  # Log masked URL

    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Database connected and tables verified.")
            break
        except Exception as e:
            logger.warning(f"Database connection blocked ({attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_interval} seconds...")
                await asyncio.sleep(retry_interval)
            else:
                logger.error("❌ Could not connect to database after multiple attempts.")
                # We don't raise here to allow the app to start (and perhaps heal later),
                # or you might want to raise e to crash the container.
                # For now, let's allow startup so logs can be seen.

    try:
        # Seed admin and settings
        async with AsyncSessionLocal() as db:
            await seed_default_admin(db)
            await seed_default_settings(db)
            await cleanup_old_logs(db)

        # Start scheduler for backups
        setup_scheduled_tasks()
        scheduler.start()
        logger.info("Scheduler started for weekly backups")

    except Exception as e:
        logger.error(f"Startup tasks failed: {e}")

    yield

    # Shutdown
    try:
        if scheduler.running:
            scheduler.shutdown()
        await engine.dispose()
    except Exception as e:
        logger.error(f"Shutdown error: {e}")


app = FastAPI(title="SentryGate IoT API", lifespan=lifespan)

# --- Include Auth Router ---
app.include_router(auth_router)

# --- Static Files for Uploads ---
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --- CORS (Hardened with Regex) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# 1. WEBSOCKET ROUTER
# ==========================================
@app.websocket("/ws/{client_type}")
async def websocket_endpoint(websocket: WebSocket, client_type: str):
    """Unified WebSocket Endpoint."""
    if client_type not in ["frontend", "hardware"]:
        await websocket.close(code=4000)
        return

    await manager.connect(websocket, client_type)

    try:
        while True:
            data = await websocket.receive_json()
            async with AsyncSessionLocal() as session:
                if client_type == "hardware":
                    await manager.process_hardware_message(data, session)
                elif client_type == "frontend":
                    await manager.process_frontend_message(data, session)

    except WebSocketDisconnect:
        manager.disconnect(websocket, client_type)
    except Exception as e:
        logger.error(f"WebSocket Error ({client_type}): {e}")
        try:
            await websocket.close()
        except Exception as close_err:
            logger.debug(f"Error during socket closure for {client_type}: {close_err}")
        manager.disconnect(websocket, client_type)


# ==========================================
# 2. REST API (Users) - PROTECTED
# ==========================================
@app.post("/users/", response_model=schemas.UserResponse)
async def create_user(
    user: schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),  # ✅ Auth required
):
    result = await db.execute(select(models.User).where(models.User.rfid_tag == user.rfid_tag))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="RFID Tag already registered")

    db_user = models.User(name=user.name, role=user.role, avatar_url=user.avatar_url, rfid_tag=user.rfid_tag)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


@app.get("/users/", response_model=List[schemas.UserResponse])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),  # ✅ Auth required
):
    result = await db.execute(select(models.User).offset(skip).limit(limit))
    return result.scalars().all()


@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),  # ✅ Auth required
):
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
    return {"ok": True}


# ==========================================
# 3. REST API (Logs) - PROTECTED
# ==========================================
@app.get("/logs/")
async def read_logs(
    skip: int = 0,
    limit: int = Query(default=50, le=100),
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),  # ✅ Auth required
):
    """
    Get logs with optional filtering by status and date range
    """
    # Build query
    query = select(models.AccessLog)

    # Apply filters
    filters = []
    if status and status != "all":
        if status == "success":
            filters.append(models.AccessLog.action == "GRANTED")
        elif status == "error":
            filters.append(models.AccessLog.action == "DENIED")
        elif status == "pending":
            filters.append(models.AccessLog.action == "PENDING")

    if start_date:
        filters.append(models.AccessLog.timestamp >= start_date)
    if end_date:
        filters.append(models.AccessLog.timestamp <= end_date)

    if filters:
        query = query.where(and_(*filters))

    # Get total count
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    # Get stats
    stats_result = await db.execute(
        select(
            func.count().filter(models.AccessLog.action == "GRANTED").label("success"),
            func.count().filter(models.AccessLog.action == "DENIED").label("error"),
            func.count().filter(models.AccessLog.action == "PENDING").label("pending"),
            func.count().label("all"),
        )
    )
    stats_row = stats_result.first()
    stats = {
        "success": stats_row.success if stats_row else 0,
        "error": stats_row.error if stats_row else 0,
        "pending": stats_row.pending if stats_row else 0,
        "all": stats_row.all if stats_row else 0,
    }

    # Get paginated logs
    result = await db.execute(query.order_by(models.AccessLog.timestamp.desc()).offset(skip).limit(limit))
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id": log.id,
                "user_name": log.user_name,
                "action": log.action,
                "timestamp": log.timestamp.isoformat(),
                "is_duress": log.is_duress,
                "temperature": log.temperature,
                "rfid_tag": log.rfid_tag,
            }
            for log in logs
        ],
        "total": total,
        "stats": stats,
    }


# ==========================================
# 4. REST API (Settings)
# ==========================================
@app.get("/settings/")
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get all settings"""
    result = await db.execute(select(models.SystemSettings))
    settings = result.scalars().all()
    return {"settings": {s.key: s.value for s in settings}}


@app.put("/settings/")
async def update_settings(
    data: schemas.BulkSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),
):
    """Update multiple settings at once"""
    for key, value in data.settings.items():
        result = await db.execute(select(models.SystemSettings).where(models.SystemSettings.key == key))
        setting = result.scalars().first()
        if setting:
            setting.value = str(value)
            setting.updated_at = datetime.now(timezone.utc)
        else:
            db.add(models.SystemSettings(key=key, value=str(value)))

    await db.commit()
    return {"ok": True, "message": "تنظیمات ذخیره شد"}


# ==========================================
# 5. REST API (Profile)
# ==========================================
@app.put("/profile/")
async def update_profile(
    data: schemas.ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),
):
    """Update current user profile"""
    if data.full_name:
        current_user.full_name = data.full_name
    if data.email:
        current_user.email = data.email

    await db.commit()
    return {"ok": True, "message": "پروفایل بروزرسانی شد"}


@app.post("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),
):
    """Upload user avatar"""
    # ✅ Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="فقط تصاویر مجاز هستند")

    # ✅ Validate file size (max 20MB)
    MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="حجم فایل نباید بیشتر از 20 مگابایت باشد")

    # Generate filename
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    # ✅ Sanitize extension
    ext = ext.lower()[:4] if ext.isalnum() else "jpg"
    filename = f"avatar_{current_user.id}.{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    # Delete old avatar if exists
    if current_user.avatar_path:
        old_path = os.path.join(UPLOAD_DIR, current_user.avatar_path.lstrip("/uploads/"))
        if os.path.exists(old_path):
            os.remove(old_path)

    # Save new file (already read into memory)
    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    # Update user record
    current_user.avatar_path = f"/uploads/avatars/{filename}"
    await db.commit()

    return {"ok": True, "avatar_url": current_user.avatar_path}


@app.put("/profile/password")
async def change_password(
    data: schemas.PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),
):
    """Change user password"""
    from .services.security import verify_password

    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="رمز عبور فعلی اشتباه است")

    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()

    return {"ok": True, "message": "رمز عبور تغییر کرد"}


# ==========================================
# 6. ROOT & DEBUG (Protected or Disabled)
# ==========================================
@app.get("/")
async def root():
    return {"message": "SentryGate IoT Backend is Online 🚀"}


# ✅ Debug endpoints - PROTECTED and should be disabled in production
import os as _os

DEBUG_MODE = _os.getenv("DEBUG_MODE", "false").lower() == "true"


@app.post("/api/debug/simulate-scan")
async def simulate_scan(
    payload: schemas.HardwareMessage,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),  # ✅ Auth required
):
    """Simulate a hardware scan event for testing. REQUIRES AUTHENTICATION."""
    if not DEBUG_MODE:
        raise HTTPException(status_code=403, detail="Debug mode disabled in production")

    data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    await manager.process_hardware_message(data, db)
    return {"ok": True}


@app.post("/api/debug/backup")
async def trigger_backup(current_user: models.AdminUser = Depends(get_current_user)):
    """Manually trigger a database backup"""
    create_backup()
    return {"ok": True, "message": "پشتیبان‌گیری انجام شد"}
