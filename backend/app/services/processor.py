"""WebSocket Connection Manager and Hardware/Frontend Message Processor."""

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from fastapi import WebSocket
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas
from .log_service import LogService

logger = logging.getLogger("uvicorn")
OPEN_COOLDOWN_SECONDS = 2.0
TEHRAN = ZoneInfo("Asia/Tehran")


def normalize_rfid(rfid: Optional[str]) -> str:
    """Normalize RFID tag for case/prefix-insensitive fallback matching."""
    if not rfid:
        return ""
    cleaned = rfid.strip().upper()
    if cleaned.startswith("0X"):
        cleaned = cleaned[2:]
    return cleaned.replace(":", "").replace("-", "")


def is_hour_in_secure_window(current_hour: int, start: int, end: int) -> bool:
    if start == end:
        return False
    if start > end:
        return current_hour >= start or current_hour < end
    return start <= current_hour < end


class ConnectionManager:
    """Manage hardware and frontend WebSockets and process door commands/events."""

    def __init__(self) -> None:
        self.hardware_clients: List[WebSocket] = []
        self.frontend_clients: List[WebSocket] = []
        self.frontend_meta: Dict[WebSocket, Dict[str, Any]] = {}
        self._last_open_at: float = 0.0

    async def connect(
        self,
        websocket: WebSocket,
        client_type: str,
        username: Optional[str] = None,
        user_id: Optional[int] = None,
        **_: Any,
    ) -> None:
        await websocket.accept()
        if client_type == "hardware":
            self.hardware_clients.append(websocket)
            logger.info("Door hardware connected. Total: %s", len(self.hardware_clients))
        elif client_type == "frontend":
            self.frontend_clients.append(websocket)
            self.frontend_meta[websocket] = {"username": username, "user_id": user_id}
            logger.info("Frontend connected. Total: %s", len(self.frontend_clients))

    def disconnect(self, websocket: WebSocket, client_type: str) -> None:
        if client_type == "hardware" and websocket in self.hardware_clients:
            self.hardware_clients.remove(websocket)
            logger.info("Door hardware disconnected. Total: %s", len(self.hardware_clients))
        elif client_type == "frontend":
            if websocket in self.frontend_clients:
                self.frontend_clients.remove(websocket)
            self.frontend_meta.pop(websocket, None)

    async def broadcast_to_frontend(self, message: schemas.BroadcastMessage) -> None:
        payload = message.model_dump()
        active: List[WebSocket] = []
        for connection in self.frontend_clients:
            try:
                await connection.send_json(payload)
                active.append(connection)
            except Exception as e:
                logger.error("Error broadcasting to frontend: %s", e)
        self.frontend_clients = active

    async def send_to_hardware(self, message: Any, **_: Any) -> bool:
        payload = (
            message.model_dump(exclude_none=True) if hasattr(message, "model_dump") else message
        )
        active: List[WebSocket] = []
        delivered = False
        for connection in self.hardware_clients:
            try:
                await connection.send_json(payload)
                active.append(connection)
                delivered = True
            except Exception as e:
                logger.error("Error sending to hardware: %s", e)
        self.hardware_clients = active
        return delivered

    async def _get_auto_lock_hours(self, db: AsyncSession) -> Tuple[int, int]:
        result = await db.execute(
            select(models.SystemSettings).where(
                models.SystemSettings.key.in_(["auto_lock_start", "auto_lock_end"])
            )
        )
        settings = {row.key: row.value for row in result.scalars().all()}
        try:
            return (
                int(settings.get("auto_lock_start") or "22"),
                int(settings.get("auto_lock_end") or "6"),
            )
        except (TypeError, ValueError):
            return 22, 6

    async def _get_timer_duration(self, db: AsyncSession) -> int:
        raw = await self._setting(db, "timer_duration", "5")
        try:
            return max(1, min(60, int(raw)))
        except (TypeError, ValueError):
            return 5

    async def _is_secure_mode(self, db: AsyncSession, now: Optional[datetime] = None) -> bool:
        start, end = await self._get_auto_lock_hours(db)
        current = now or datetime.now(TEHRAN)
        return is_hour_in_secure_window(current.hour, start, end)

    async def _setting(self, db: AsyncSession, key: str, default: str = "") -> str:
        result = await db.execute(
            select(models.SystemSettings).where(models.SystemSettings.key == key)
        )
        row = result.scalars().first()
        return str(row.value) if row and row.value is not None else default

    async def _find_user_by_rfid(self, db: AsyncSession, rfid: str) -> Optional[models.User]:
        result = await db.execute(select(models.User).where(models.User.rfid_tag == rfid))
        user = result.scalars().first()
        if user:
            return user
        target = normalize_rfid(rfid)
        if not target:
            return None
        all_users = await db.execute(select(models.User).where(models.User.rfid_tag.isnot(None)))
        for candidate in all_users.scalars().all():
            if normalize_rfid(candidate.rfid_tag) == target:
                return candidate
        return None

    async def _send_duress_alert(self, db: AsyncSession) -> None:
        try:
            from .alert_sms import send_alert_sms

            phone = (await self._setting(db, "alert_phone", "")).strip()
            if phone:
                await send_alert_sms(phone, "SentryGate duress unlock")
        except Exception as exc:
            logger.error("Duress SMS failed: %s", type(exc).__name__)

    async def _broadcast_access_log(
        self,
        log_entry: models.AccessLog,
        temperature: Optional[float],
        avatar_url: Optional[str],
    ) -> None:
        await self.broadcast_to_frontend(
            schemas.BroadcastMessage(
                type="ACCESS_LOG",
                data={
                    "id": log_entry.id,
                    "user_name": log_entry.user_name,
                    "action": log_entry.action,
                    "timestamp": log_entry.timestamp.isoformat(),
                    "is_duress": log_entry.is_duress,
                    "temperature": temperature,
                    "avatar_url": avatar_url,
                    "rfid_tag": log_entry.rfid_tag,
                },
            )
        )

    async def _broadcast_unknown_tag(
        self,
        rfid: str,
        timestamp: str,
        temperature: Optional[float],
    ) -> None:
        await self.broadcast_to_frontend(
            schemas.BroadcastMessage(
                type="UNKNOWN_TAG",
                uid=rfid,
                timestamp=timestamp,
                data={"rfid_tag": rfid, "temperature": temperature},
            )
        )

    async def process_hardware_message(
        self,
        raw_data: dict[str, Any],
        db: AsyncSession,
        websocket: Optional[WebSocket] = None,
    ) -> None:
        try:
            msg = schemas.HardwareMessage(**raw_data)
        except Exception as e:
            logger.error("Invalid hardware message format: %s | Data: %s", e, raw_data)
            return

        if msg.type == "scan" and msg.rfid:
            await self._handle_scan(msg, db)
        elif msg.type == "telemetry":
            await self.broadcast_to_frontend(
                schemas.BroadcastMessage(type="TELEMETRY", data={"temperature": msg.temperature})
            )
        elif msg.type == "status":
            await self.broadcast_to_frontend(
                schemas.BroadcastMessage(
                    type="STATUS",
                    data={k: v for k, v in raw_data.items() if k != "type"},
                )
            )
        elif msg.type == "ping":
            pong_payload = {"cmd": "PONG"}
            if websocket is not None:
                try:
                    await websocket.send_json(pong_payload)
                except Exception as e:
                    logger.warning("Failed to send PONG to hardware: %s", e)
            else:
                await self.send_to_hardware(pong_payload)

    async def _handle_scan(self, msg: schemas.HardwareMessage, db: AsyncSession) -> None:
        log_service = LogService(db)
        rfid = (msg.rfid or "").strip()
        temperature = msg.temperature
        duress_mode = (await self._setting(db, "duress_mode", "false")).strip().lower() == "true"
        duress_rfid = (await self._setting(db, "duress_rfid", "")).strip()
        user = await self._find_user_by_rfid(db, rfid)

        if msg.local_decision is not None:
            is_duress = bool(msg.is_duress) or bool(
                duress_mode and duress_rfid and normalize_rfid(rfid) == normalize_rfid(duress_rfid)
            )
            if msg.local_decision == "GRANTED":
                user_name = (
                    "Duress" if is_duress else (str(user.name) if user and user.name else "User")
                )
                log_entry = await log_service.create_access_log(
                    user_name=user_name,
                    rfid=rfid,
                    action="GRANTED",
                    is_duress=is_duress,
                    temperature=temperature,
                )
                if is_duress:
                    await self._send_duress_alert(db)
            else:
                user_name = str(user.name) if user and user.name else "Unknown"
                log_entry = await log_service.create_access_log(
                    user_name=user_name,
                    rfid=rfid,
                    action="DENIED",
                    is_duress=False,
                    temperature=temperature,
                )

            await self._broadcast_access_log(
                log_entry, temperature, str(user.avatar_url) if user and user.avatar_url else None
            )
            if msg.local_decision == "DENIED" and user is None and not is_duress:
                await self._broadcast_unknown_tag(
                    rfid, log_entry.timestamp.isoformat(), temperature
                )
            return

        is_duress = bool(
            duress_mode
            and (
                msg.is_duress
                or (duress_rfid and normalize_rfid(rfid) == normalize_rfid(duress_rfid))
            )
        )
        now = models.utc_now()
        allowed = False
        user_name = str(user.name) if user and user.name else "Unknown"

        if is_duress:
            allowed, user_name = True, "Duress"
        elif user and user.is_active and (user.expires_at is None or user.expires_at > now):
            allowed, user_name = True, str(user.name or "User")

        if await self._is_secure_mode(db) and not is_duress:
            allowed = False

        if not allowed:
            await self.send_to_hardware(schemas.HardwareCommand(cmd="DENY"))
            log_entry = await log_service.create_access_log(
                user_name=user_name,
                rfid=rfid,
                action="DENIED",
                is_duress=False,
                temperature=temperature,
            )
            await self._broadcast_access_log(
                log_entry, temperature, str(user.avatar_url) if user and user.avatar_url else None
            )
            if user is None and not is_duress:
                await self._broadcast_unknown_tag(
                    rfid, log_entry.timestamp.isoformat(), temperature
                )
            return

        timer_duration = await self._get_timer_duration(db)
        if not await self._open_with_cooldown(duration=timer_duration):
            return
        log_entry = await log_service.create_access_log(
            user_name=user_name,
            rfid=rfid,
            action="GRANTED",
            is_duress=is_duress,
            temperature=temperature,
        )
        if is_duress:
            await self._send_duress_alert(db)
        await self._broadcast_access_log(
            log_entry, temperature, str(user.avatar_url) if user and user.avatar_url else None
        )

    async def _open_with_cooldown(self, duration: int = 5) -> bool:
        now = time.monotonic()
        if now - self._last_open_at < OPEN_COOLDOWN_SECONDS:
            logger.info("OPEN ignored (cooldown)")
            return False
        self._last_open_at = now
        await self.send_to_hardware(
            schemas.HardwareCommand(cmd="OPEN", duration=max(1, min(60, int(duration))))
        )
        return True

    async def process_frontend_message(self, raw_data: dict[str, Any], db: AsyncSession) -> None:
        try:
            msg = schemas.FrontendMessage(**raw_data)
        except Exception as e:
            logger.error("Invalid frontend message: %s", e)
            return
        if msg.cmd == "OPEN":
            await self._handle_frontend_open(db)

    async def _handle_frontend_open(self, db: AsyncSession) -> None:
        log_service = LogService(db)
        if await self._is_secure_mode(db):
            await self.send_to_hardware(schemas.HardwareCommand(cmd="DENY"))
            log_entry = await log_service.create_access_log(
                user_name="Remote Admin",
                rfid="MANUAL_OVERRIDE",
                action="DENIED",
                is_duress=False,
                temperature=None,
            )
        else:
            timer_duration = await self._get_timer_duration(db)
            if not await self._open_with_cooldown(duration=timer_duration):
                return
            log_entry = await log_service.create_access_log(
                user_name="Remote Admin",
                rfid="MANUAL_OVERRIDE",
                action="GRANTED",
                is_duress=False,
                temperature=None,
            )
        await self._broadcast_access_log(log_entry, None, None)


manager = ConnectionManager()
