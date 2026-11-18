"""SentryGate IoT FastAPI entrypoint."""

from __future__ import annotations

import asyncio
import csv
import hmac
import io
import logging
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator, List, Literal, Optional

from fastapi import (
    Depends,
    FastAPI,
    File,
    Header,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from . import models, schemas
from .database import AsyncSessionLocal, Base, engine, get_db
from .services.auth_deps import (
    check_and_lock_idempotency,
    release_idempotency_lock,
    require_roles,
    store_idempotency_result,
)
from .services.auth_router import consume_ws_ticket, get_current_user
from .services.auth_router import router as auth_router
from .services.door_api import invalidate_allowlist
from .services.door_api import router as door_api_router
from .services.processor import manager
from .services.security import (
    check_secret_hygiene,
    cleanup_old_logs,
    create_backup,
    decode_access_token,
    hash_password,
    scheduler,
    setup_logging,
    setup_scheduled_tasks,
    verify_password,
)

from . import env_loader  # noqa: F401  # isort:skip  # pylint: disable=unused-import

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")
setup_logging()

_default_origins = [
    "http://localhost:3100",
    "http://127.0.0.1:3100",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_cors_env = os.getenv("CORS_ORIGINS", "").strip()
origins = (
    [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env else list(_default_origins)
)
for _o in _default_origins:
    if _o not in origins:
        origins.append(_o)
logger.info("CORS Policy applied for origins: %s", origins)
SEED_DEFAULT_ADMIN = os.getenv("SEED_DEFAULT_ADMIN", "true").lower() == "true"

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)
MAX_AVATAR_BYTES = 5 * 1024 * 1024


def _to_naive_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _detect_image_extension(contents: bytes) -> Optional[str]:
    if contents.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if contents.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        return "webp"
    return None


def _csv_safe(val: object) -> str:
    text_val = "" if val is None else str(val)
    if text_val and text_val[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text_val
    return text_val


async def seed_default_admin(db: AsyncSession) -> None:
    if not SEED_DEFAULT_ADMIN:
        logger.info("Default admin seed skipped (SEED_DEFAULT_ADMIN=false)")
        return
    result = await db.execute(select(models.AdminUser).where(models.AdminUser.username == "admin"))
    if result.scalars().first():
        logger.info("Admin user already exists")
        return
    default_password = os.getenv("DEFAULT_ADMIN_PASSWORD") or "admin123"
    db.add(
        models.AdminUser(
            username="admin",
            hashed_password=hash_password(default_password),
            full_name="مدیر سیستم",
            email="admin@sentry.local",
            role="admin",
            clearance_level=5,
            is_active=True,
        )
    )
    await db.commit()
    logger.info("Default admin user created: admin")


async def seed_default_settings(db: AsyncSession) -> None:
    defaults = {
        "theme": "neon",
        "language": "fa",
        "auto_lock_start": "22",
        "auto_lock_end": "6",
        "timer_duration": "5",
        "require_pin_with_rfid": "false",
        "duress_mode": "false",
        "duress_rfid": "",
        "duress_pin_hash": "",
        "alert_phone": "",
    }
    for key, value in defaults.items():
        result = await db.execute(
            select(models.SystemSettings).where(models.SystemSettings.key == key)
        )
        if not result.scalars().first():
            db.add(models.SystemSettings(key=key, value=value))
    await db.commit()
    logger.info("Default settings initialized")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    setup_logging()
    check_secret_hygiene()
    max_retries = 10
    retry_interval = 5
    db_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./sql_app.db")
    auto_create = os.getenv("AUTO_CREATE_SCHEMA", "false").lower() == "true"
    should_create_schema = ("sqlite" in db_url.lower()) or auto_create
    logger.info("Connecting to database at... %s", db_url.split("@")[-1])
    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                if should_create_schema:
                    await conn.run_sync(Base.metadata.create_all)
                else:
                    await conn.execute(text("SELECT 1"))
            logger.info(
                "Database connected%s.",
                " and tables verified" if should_create_schema else "",
            )
            break
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.warning("Database connection blocked (%s/%s): %s", attempt + 1, max_retries, e)
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_interval)
    try:
        async with AsyncSessionLocal() as db:
            await seed_default_admin(db)
            await seed_default_settings(db)
            await cleanup_old_logs(db)
        setup_scheduled_tasks()
        if not scheduler.running:
            scheduler.start()
        logger.info("Scheduler started for backups and daily cleanup")
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Startup tasks failed: %s", e)
    yield
    try:
        if scheduler.running:
            scheduler.shutdown()
        await engine.dispose()
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Shutdown error: %s", e)


app = FastAPI(title="SentryGate IoT API", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(door_api_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "sentrygate-backend"}


app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/{client_type}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_type: str,
    token: Optional[str] = Query(None),
    ticket: Optional[str] = Query(None),
) -> None:
    if client_type not in ["frontend", "hardware"]:
        await websocket.accept()
        await websocket.close(code=4000)
        return

    frontend_username: Optional[str] = None
    frontend_user_id: Optional[int] = None

    if client_type == "frontend":
        auth_token = token
        if not auth_token and ticket:
            auth_token = await consume_ws_ticket(ticket)
        payload = decode_access_token(auth_token) if auth_token else None
        if not payload:
            await websocket.accept()
            await websocket.close(code=4401)
            return
        frontend_username = payload.get("sub")
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(models.AdminUser).where(
                    models.AdminUser.username == frontend_username,
                    models.AdminUser.is_active.is_(True),
                )
            )
            admin = result.scalars().first()
            if not admin:
                await websocket.accept()
                await websocket.close(code=4401)
                return
            frontend_user_id = int(admin.id)
    else:
        expected = os.getenv("HARDWARE_TOKEN", "")
        if not expected or not hmac.compare_digest(token or "", expected):
            await websocket.accept()
            await websocket.close(code=4401)
            return

    await manager.connect(
        websocket, client_type, username=frontend_username, user_id=frontend_user_id
    )
    try:
        while True:
            data = await websocket.receive_json()
            async with AsyncSessionLocal() as session:
                if client_type == "hardware":
                    await manager.process_hardware_message(data, session, websocket=websocket)
                else:
                    await manager.process_frontend_message(data, session)
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_type)
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("WebSocket Error (%s): %s", client_type, e)
        try:
            await websocket.close()
        except Exception as close_err:  # pylint: disable=broad-exception-caught
            logger.debug("WebSocket close ignored: %s", close_err)
        manager.disconnect(websocket, client_type)


@app.post("/users/", response_model=schemas.UserResponse)
async def create_user(
    user: schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Any:
    cached, idem_lock = check_and_lock_idempotency(
        "create_user", idempotency_key, int(current_user.id)
    )
    if cached is not None:
        return cached

    try:
        result = await db.execute(select(models.User).where(models.User.rfid_tag == user.rfid_tag))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="RFID Tag already registered")
        db_user = models.User(
            name=user.name,
            role=user.role,
            avatar_url=user.avatar_url,
            rfid_tag=user.rfid_tag,
            expires_at=_to_naive_utc(user.expires_at),
        )
        db.add(db_user)
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(status_code=400, detail="RFID Tag already registered") from exc
        await db.refresh(db_user)
        await invalidate_allowlist()
        validated = schemas.UserResponse.model_validate(db_user)
        store_idempotency_result(idem_lock, validated.model_dump(mode="json"))
        return validated
    except Exception:
        release_idempotency_lock(idem_lock)
        raise


@app.get("/users/", response_model=List[schemas.UserResponse])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _current_user: models.AdminUser = Depends(get_current_user),
) -> Any:
    result = await db.execute(select(models.User).offset(skip).limit(limit))
    return result.scalars().all()


async def _apply_user_update(
    user_id: int,
    updates: schemas.UserUpdate,
    db: AsyncSession,
) -> models.User:
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    patch_data = updates.model_dump(exclude_unset=True)
    for required_field in ("name", "role", "rfid_tag", "is_active"):
        if required_field in patch_data and patch_data[required_field] is None:
            raise HTTPException(status_code=422, detail=f"Field '{required_field}' cannot be null")

    if "rfid_tag" in patch_data and patch_data["rfid_tag"] != user.rfid_tag:
        dup = await db.execute(
            select(models.User).where(
                models.User.rfid_tag == patch_data["rfid_tag"],
                models.User.id != user_id,
            )
        )
        if dup.scalars().first():
            raise HTTPException(status_code=400, detail="RFID Tag already registered")
        user.rfid_tag = patch_data["rfid_tag"]

    if "name" in patch_data:
        user.name = patch_data["name"]
    if "role" in patch_data:
        user.role = patch_data["role"]
    if "avatar_url" in patch_data:
        user.avatar_url = patch_data["avatar_url"]
    if "is_active" in patch_data:
        user.is_active = patch_data["is_active"]
    if "expires_at" in patch_data:
        user.expires_at = _to_naive_utc(patch_data["expires_at"])

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="RFID Tag already registered") from exc
    await db.refresh(user)
    await invalidate_allowlist()
    return user


@app.patch("/users/{user_id}", response_model=schemas.UserResponse)
async def patch_user(
    user_id: int,
    updates: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: models.AdminUser = Depends(get_current_user),
) -> Any:
    return await _apply_user_update(user_id, updates, db)


@app.put("/users/{user_id}", response_model=schemas.UserResponse)
async def put_user(
    user_id: int,
    updates: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: models.AdminUser = Depends(get_current_user),
) -> Any:
    return await _apply_user_update(user_id, updates, db)


@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _current_user: models.AdminUser = Depends(get_current_user),
) -> dict[str, bool]:
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    await invalidate_allowlist()
    return {"ok": True}


def _build_log_filters(
    status: Optional[str],
    q: Optional[str],
    start_date: Optional[datetime],
    end_date: Optional[datetime],
) -> list[Any]:
    filters: list[Any] = []
    if status and status != "all":
        if status == "success":
            filters.append(models.AccessLog.action == "GRANTED")
        elif status == "error":
            filters.append(models.AccessLog.action.in_(["DENIED", "PIN_DENIED"]))
        elif status == "pending":
            filters.append(models.AccessLog.action == "PENDING")
    if q and q.strip():
        term = f"%{q.strip()}%"
        filters.append(
            or_(
                models.AccessLog.user_name.ilike(term),
                models.AccessLog.rfid_tag.ilike(term),
            )
        )
    if start_date:
        filters.append(models.AccessLog.timestamp >= _to_naive_utc(start_date))
    if end_date:
        filters.append(models.AccessLog.timestamp <= _to_naive_utc(end_date))
    return filters


@app.get("/logs/")
async def read_logs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[Literal["success", "error", "pending", "all"]] = None,
    q: Optional[str] = Query(default=None, max_length=120),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    _current_user: models.AdminUser = Depends(get_current_user),
) -> dict[str, Any]:
    query = select(models.AccessLog)
    filters = _build_log_filters(status, q, start_date, end_date)
    if filters:
        query = query.where(and_(*filters))
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())  # pylint: disable=not-callable
    )
    total = int(count_result.scalar() or 0)
    stats_result = await db.execute(
        select(
            func.count()  # pylint: disable=not-callable
            .filter(models.AccessLog.action == "GRANTED")
            .label("success"),
            func.count()  # pylint: disable=not-callable
            .filter(models.AccessLog.action.in_(["DENIED", "PIN_DENIED"]))
            .label("error"),
            func.count()  # pylint: disable=not-callable
            .filter(models.AccessLog.action == "PENDING")
            .label("pending"),
            func.count().label("all"),  # pylint: disable=not-callable
        )
    )
    stats_row = stats_result.first()
    stats = {
        "success": int(stats_row.success) if stats_row else 0,
        "error": int(stats_row.error) if stats_row else 0,
        "pending": int(stats_row.pending) if stats_row else 0,
        "all": int(stats_row.all) if stats_row else 0,
    }
    result = await db.execute(
        query.order_by(models.AccessLog.timestamp.desc()).offset(skip).limit(limit)
    )
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


@app.get("/logs/export")
async def export_logs_csv(
    status: Optional[Literal["success", "error", "pending", "all"]] = None,
    q: Optional[str] = Query(default=None, max_length=120),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    _current_user: models.AdminUser = Depends(get_current_user),
) -> StreamingResponse:
    query = select(models.AccessLog)
    filters = _build_log_filters(status, q, start_date, end_date)
    if filters:
        query = query.where(and_(*filters))
    result = await db.execute(query.order_by(models.AccessLog.timestamp.desc()))
    logs = result.scalars().all()

    buf = io.StringIO()
    buf.write("\ufeff")
    writer = csv.writer(buf)
    writer.writerow(
        ["id", "timestamp", "user_name", "rfid_tag", "action", "is_duress", "temperature"]
    )
    for log in logs:
        writer.writerow(
            [
                _csv_safe(log.id),
                _csv_safe(log.timestamp.isoformat() if log.timestamp else ""),
                _csv_safe(log.user_name),
                _csv_safe(log.rfid_tag),
                _csv_safe(log.action),
                _csv_safe(bool(log.is_duress)),
                _csv_safe("" if log.temperature is None else log.temperature),
            ]
        )
    csv_bytes = buf.getvalue().encode("utf-8")
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="access_logs.csv"'},
    )


@app.get("/settings/")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _current_user: models.AdminUser = Depends(get_current_user),
) -> dict[str, Any]:
    result = await db.execute(select(models.SystemSettings))
    rows = result.scalars().all()
    payload: dict[str, Any] = {}
    for row in rows:
        if row.key == "duress_pin_hash":
            payload[row.key] = "__CONFIGURED__" if (row.value or "").strip() else ""
        else:
            payload[str(row.key)] = row.value
    return {"settings": payload}


async def _upsert_setting(db: AsyncSession, key: str, value: str) -> None:
    result = await db.execute(select(models.SystemSettings).where(models.SystemSettings.key == key))
    setting = result.scalars().first()
    if setting:
        setting.value = value
        setting.updated_at = models.utc_now()
    else:
        db.add(models.SystemSettings(key=key, value=value))


@app.put("/settings/")
async def update_settings(
    data: schemas.BulkSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: models.AdminUser = Depends(require_roles("admin")),
) -> dict[str, Any]:
    from .services.pin_crypto import hash_pin, validate_pin_format

    clear_flag = str(data.settings.get("clear_duress_pin", "")).strip().lower() == "true"
    if clear_flag:
        await _upsert_setting(db, "duress_pin_hash", "")

    for key, value in data.settings.items():
        if key in ("clear_duress_pin", "duress_pin_hash"):
            continue
        store_key = key
        store_value = "" if value is None else str(value)
        if key == "duress_pin":
            trimmed = store_value.strip()
            if trimmed == "__CLEAR__":
                store_key = "duress_pin_hash"
                store_value = ""
            elif not trimmed:
                continue
            else:
                if clear_flag:
                    continue
                if not validate_pin_format(trimmed):
                    raise HTTPException(status_code=400, detail="PIN باید ۴ تا ۸ رقم باشد")
                store_key = "duress_pin_hash"
                store_value = hash_pin(trimmed)
        elif key == "duress_rfid":
            store_value = store_value.strip()
        elif key in ("auto_lock_start", "auto_lock_end", "timer_duration"):
            store_value = store_value.strip()
        elif key == "alert_phone":
            store_value = store_value.strip()

        await _upsert_setting(db, store_key, store_value)

    await db.commit()
    await invalidate_allowlist()
    return {"ok": True, "message": "تنظیمات ذخیره شد"}


@app.put("/profile/")
async def update_profile(
    data: schemas.ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),
) -> dict[str, Any]:
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
) -> dict[str, Any]:
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="فقط تصاویر مجاز هستند")

    contents = await file.read(MAX_AVATAR_BYTES + 1)
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="حجم فایل نباید بیشتر از ۵ مگابایت باشد")

    ext = _detect_image_extension(contents)
    if not ext:
        raise HTTPException(status_code=400, detail="فرمت واقعی فایل تصویر معتبر نیست")

    os.makedirs(AVATAR_DIR, exist_ok=True)
    filename = f"avatar_{current_user.id}_{secrets.token_hex(4)}.{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    if current_user.avatar_path:
        upload_root = os.path.realpath(UPLOAD_DIR)
        rel_path = str(current_user.avatar_path).removeprefix("/uploads/").lstrip("/\\")
        old_path = os.path.realpath(os.path.join(upload_root, rel_path))
        if old_path.startswith(upload_root + os.sep) and os.path.exists(old_path):
            os.remove(old_path)

    with open(filepath, "wb") as buffer:
        buffer.write(contents)
    current_user.avatar_path = f"/uploads/avatars/{filename}"
    await db.commit()
    return {"ok": True, "avatar_url": current_user.avatar_path}


@app.put("/profile/password")
async def change_password(
    data: schemas.PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: models.AdminUser = Depends(get_current_user),
) -> dict[str, Any]:
    if not verify_password(data.current_password, str(current_user.hashed_password)):
        raise HTTPException(status_code=400, detail="رمز عبور فعلی اشتباه است")
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"ok": True, "message": "رمز عبور تغییر کرد"}


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "SentryGate IoT Backend is Online"}


@app.post("/api/debug/simulate-scan")
async def simulate_scan(
    payload: schemas.HardwareMessage,
    db: AsyncSession = Depends(get_db),
    _current_user: models.AdminUser = Depends(require_roles("admin")),
) -> dict[str, bool]:
    if os.getenv("DEBUG_MODE", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Debug mode disabled in production")
    await manager.process_hardware_message(payload.model_dump(), db)
    return {"ok": True}


@app.post("/api/debug/backup")
async def trigger_backup(
    _current_user: models.AdminUser = Depends(require_roles("admin")),
) -> dict[str, Any]:
    create_backup()
    return {"ok": True, "message": "پشتیبان‌گیری انجام شد"}
