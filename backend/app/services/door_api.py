"""Door APIs: allowlist for hardware, temporary PINs, user PIN set/clear, offline event sync."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from datetime import timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas
from ..database import get_db
from . import redis_store
from .auth_deps import (
    check_and_lock_idempotency,
    get_current_user,
    release_idempotency_lock,
    store_idempotency_result,
)
from .pin_crypto import (
    PIN_PEPPER_ID,
    device_hmac_key_hex,
    generate_temp_pin,
    hash_pin,
    validate_pin_format,
)
from .processor import manager

logger = logging.getLogger("uvicorn")
router = APIRouter(tags=["Door"])


def _hardware_token() -> str:
    return os.getenv("HARDWARE_TOKEN", "")


def _check_hw_token(
    x_hardware_token: Optional[str] = Header(default=None, alias="X-Hardware-Token"),
    token: Optional[str] = Query(default=None),
) -> None:
    expected = _hardware_token()
    provided = x_hardware_token or token or ""
    if not expected or not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="hardware token invalid")


async def build_allowlist_payload(db: AsyncSession) -> dict[str, Any]:
    settings_rows = await db.execute(select(models.SystemSettings))
    settings = {r.key: r.value for r in settings_rows.scalars().all()}
    try:
        start = int(settings.get("auto_lock_start") or "22")
        end = int(settings.get("auto_lock_end") or "6")
    except (TypeError, ValueError):
        start, end = 22, 6
    try:
        timer_duration = max(1, min(60, int(settings.get("timer_duration") or "5")))
    except (TypeError, ValueError):
        timer_duration = 5

    require_pin = (settings.get("require_pin_with_rfid") or "false").lower() == "true"
    duress_mode = (settings.get("duress_mode") or "false").lower() == "true"
    duress_rfid = ((settings.get("duress_rfid") or "").strip() or None) if duress_mode else None
    duress_pin_hash = (
        ((settings.get("duress_pin_hash") or "").strip() or None) if duress_mode else None
    )

    users = await db.execute(select(models.User).where(models.User.is_active == True))  # noqa: E712
    now = models.utc_now()
    tags = []
    for u in users.scalars().all():
        if u.expires_at and u.expires_at < now:
            continue
        tags.append(
            {
                "name": u.name or "User",
                "rfid": u.rfid_tag,
                "pin_hash": u.pin_hash,
                "expires_at": u.expires_at.isoformat() if u.expires_at else None,
            }
        )

    temps = await db.execute(
        select(models.TemporaryPin).where(
            models.TemporaryPin.uses_remaining > 0,
            models.TemporaryPin.expires_at > now,
        )
    )
    temp_pins = [
        {
            "pin_hash": t.code_hash,
            "expires_at": t.expires_at.isoformat(),
            "uses_remaining": t.uses_remaining,
        }
        for t in temps.scalars().all()
    ]

    payload: dict[str, Any] = {
        "pin_pepper_id": PIN_PEPPER_ID,
        "device_hmac_key": device_hmac_key_hex(),
        "max_stale_seconds": 86400,
        "timezone": "Asia/Tehran",
        "auto_lock_start": start,
        "auto_lock_end": end,
        "timer_duration": timer_duration,
        "require_pin_with_rfid": require_pin,
        "duress_mode": duress_mode,
        "duress_rfid": duress_rfid,
        "duress_pin_hash": duress_pin_hash,
        "tags": tags,
        "temp_pins": temp_pins,
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    payload["etag"] = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]
    return payload


@router.get("/api/hardware/allowlist")
async def hardware_allowlist(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_check_hw_token),
) -> dict[str, Any]:
    return await build_allowlist_payload(db)


async def invalidate_allowlist() -> None:
    try:
        await manager.send_to_hardware(schemas.HardwareCommand(cmd="ALLOWLIST_INVALIDATE"))
    except Exception as e:
        logger.warning("ALLOWLIST_INVALIDATE send failed: %s", e)


class TempPinCreate(BaseModel):
    label: Optional[str] = None
    ttl_hours: int = Field(default=24, ge=1, le=168)
    max_uses: int = Field(default=1, ge=1, le=100)
    send_sms: bool = True
    phone: Optional[str] = None


@router.get("/api/temporary-pins")
async def list_temp_pins(
    db: AsyncSession = Depends(get_db),
    _: models.AdminUser = Depends(get_current_user),
) -> list[dict[str, Any]]:
    result = await db.execute(select(models.TemporaryPin).order_by(models.TemporaryPin.id.desc()))
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "label": r.label,
            "expires_at": r.expires_at.isoformat(),
            "uses_remaining": r.uses_remaining,
            "created_by": r.created_by,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("/api/temporary-pins")
async def create_temp_pin(
    data: TempPinCreate,
    db: AsyncSession = Depends(get_db),
    user: models.AdminUser = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> dict[str, Any]:
    cached, idem_lock = check_and_lock_idempotency("create_temp_pin", idempotency_key, int(user.id))
    if cached is not None:
        return dict(cached)

    try:
        plain = generate_temp_pin(6)
        row = models.TemporaryPin(
            code_hash=hash_pin(plain),
            expires_at=models.utc_now() + timedelta(hours=data.ttl_hours),
            uses_remaining=data.max_uses,
            created_by=user.id,
            label=data.label,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)
        await invalidate_allowlist()

        sms_sent = False
        if data.send_sms and data.phone:
            from .alert_sms import send_alert_sms

            sms_sent = await send_alert_sms(
                data.phone, f"SentryGate temp PIN: {plain} (do not share)"
            )

        response_body = {
            "id": row.id,
            "pin": plain,
            "expires_at": row.expires_at.isoformat(),
            "uses_remaining": row.uses_remaining,
            "sms_sent": sms_sent,
        }
        store_idempotency_result(idem_lock, response_body)
        return response_body
    except Exception:
        release_idempotency_lock(idem_lock)
        raise


@router.delete("/api/temporary-pins/{pin_id}")
async def revoke_temp_pin(
    pin_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.AdminUser = Depends(get_current_user),
) -> dict[str, Any]:
    result = await db.execute(select(models.TemporaryPin).where(models.TemporaryPin.id == pin_id))
    row = result.scalars().first()
    if not row:
        raise HTTPException(404, "not found")
    row.uses_remaining = 0
    await db.commit()
    await invalidate_allowlist()
    return {"ok": True}


class UserPinSet(BaseModel):
    pin: str


@router.put("/users/{user_id}/pin")
async def set_user_pin(
    user_id: int,
    data: UserPinSet,
    db: AsyncSession = Depends(get_db),
    _: models.AdminUser = Depends(get_current_user),
) -> dict[str, Any]:
    if not validate_pin_format(data.pin):
        raise HTTPException(400, "PIN باید ۴ تا ۸ رقم باشد")
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "کاربر یافت نشد")
    user.pin_hash = hash_pin(data.pin)
    await db.commit()
    await invalidate_allowlist()
    return {"ok": True}


@router.delete("/users/{user_id}/pin")
async def clear_user_pin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.AdminUser = Depends(get_current_user),
) -> dict[str, Any]:
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "کاربر یافت نشد")
    user.pin_hash = None
    await db.commit()
    await invalidate_allowlist()
    return {"ok": True}


@router.post("/api/hardware/events")
async def hardware_events(
    payload: schemas.HardwareEventsPayload,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_check_hw_token),
) -> dict[str, Any]:
    """Flush offline queued events from ESP32 with deduplication and atomic temp-PIN decrement."""
    processed = 0
    has_duress = False

    for ev in payload.events:
        if ev.event_id:
            if not redis_store.set_nx_ex(f"hw_ev:{ev.event_id}", "1", 86400):
                continue

        et = ev.type.strip().upper()
        if et == "TEMP_PIN_USED":
            if not ev.pin_hash:
                continue
            stmt = (
                update(models.TemporaryPin)
                .where(
                    models.TemporaryPin.code_hash == ev.pin_hash,
                    models.TemporaryPin.uses_remaining > 0,
                )
                .values(uses_remaining=models.TemporaryPin.uses_remaining - 1)
                .returning(models.TemporaryPin.id, models.TemporaryPin.label)
            )
            res = await db.execute(stmt)
            updated_row = res.first()
            user_name = ev.user_name or (
                str(updated_row.label) if updated_row and updated_row.label else "Temp PIN"
            )
            db.add(
                models.AccessLog(
                    user_name=user_name,
                    rfid_tag=ev.rfid or ev.channel or "PIN",
                    action=(ev.action or "GRANTED").upper(),
                    is_duress=bool(ev.is_duress),
                    temperature=ev.temperature,
                )
            )
            processed += 1
        elif et in ("GRANTED", "DENIED", "PIN_DENIED", "ACCESS_LOG"):
            action_val = (ev.action or ("GRANTED" if et == "ACCESS_LOG" else et)).upper()
            db.add(
                models.AccessLog(
                    user_name=ev.user_name or "Offline",
                    rfid_tag=ev.rfid or ev.channel or "PIN",
                    action=action_val,
                    is_duress=bool(ev.is_duress),
                    temperature=ev.temperature,
                )
            )
            processed += 1
        else:
            continue

        if ev.is_duress:
            has_duress = True

    await db.commit()

    if has_duress:
        try:
            from .alert_sms import send_alert_sms

            res_phone = await db.execute(
                select(models.SystemSettings).where(models.SystemSettings.key == "alert_phone")
            )
            setting = res_phone.scalars().first()
            phone = (str(setting.value) if setting and setting.value else "").strip()
            if phone:
                await send_alert_sms(phone, "SentryGate duress unlock")
        except Exception as exc:
            logger.error(
                "Duress SMS alert error during hardware event sync: %s", type(exc).__name__
            )

    return {"ok": True, "processed": processed}
