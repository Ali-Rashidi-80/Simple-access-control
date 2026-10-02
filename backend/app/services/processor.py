import logging
from typing import List

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from .. import schemas
from .auth_service import AuthService
from .log_service import LogService

logger = logging.getLogger("uvicorn")


class ConnectionManager:
    def __init__(self):
        self.hardware_clients: List[WebSocket] = []
        self.frontend_clients: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, client_type: str):
        await websocket.accept()
        if client_type == "hardware":
            self.hardware_clients.append(websocket)
            logger.info(f"Hardware connected. Total: {len(self.hardware_clients)}")
        elif client_type == "frontend":
            self.frontend_clients.append(websocket)
            logger.info(f"Frontend connected. Total: {len(self.frontend_clients)}")

    def disconnect(self, websocket: WebSocket, client_type: str):
        if client_type == "hardware":
            if websocket in self.hardware_clients:
                self.hardware_clients.remove(websocket)
        elif client_type == "frontend":
            if websocket in self.frontend_clients:
                self.frontend_clients.remove(websocket)

    async def broadcast_to_frontend(self, message: schemas.BroadcastMessage):
        payload = message.model_dump()
        # Clean disconnected clients while broadcasting
        active_clients = []
        for connection in self.frontend_clients:
            try:
                await connection.send_json(payload)
                active_clients.append(connection)
            except Exception as e:
                logger.error(f"Error broadcasting to frontend: {e}")
        self.frontend_clients = active_clients

    async def send_to_hardware(self, message: schemas.HardwareCommand):
        payload = message.model_dump()
        active_clients = []
        for connection in self.hardware_clients:
            try:
                await connection.send_json(payload)
                active_clients.append(connection)
            except Exception as e:
                logger.error(f"Error sending to hardware: {e}")
        self.hardware_clients = active_clients

    async def process_hardware_message(self, raw_data: dict, db: AsyncSession):
        try:
            msg = schemas.HardwareMessage(**raw_data)
        except Exception as e:
            logger.error(f"Invalid hardware message format: {e} | Data: {raw_data}")
            return

        if msg.type == "scan" and msg.rfid:
            await self._handle_scan(msg, db)
        elif msg.type == "telemetry":
            # Broadcast temperature to frontend
            await self.broadcast_to_frontend(
                schemas.BroadcastMessage(type="TELEMETRY", data={"temperature": msg.temperature})
            )
        elif msg.type == "ping":
            # Keep-alive: Send PONG acknowledgment back to hardware to confirm liveness
            logger.debug("Received ping from hardware, responding with PONG")
            await self.send_to_hardware(schemas.HardwareCommand(cmd="PONG"))

    async def _handle_scan(self, msg: schemas.HardwareMessage, db: AsyncSession):
        auth_service = AuthService(db)
        log_service = LogService(db)

        # 1. Search User via AuthService
        user = await auth_service.get_user_by_rfid(msg.rfid)

        decision = "GRANTED" if user else "DENIED"
        user_name = user.name if user else "Unknown"

        # 2. Command Hardware
        if decision == "GRANTED":
            await self.send_to_hardware(schemas.HardwareCommand(cmd="OPEN"))
        else:
            await self.send_to_hardware(schemas.HardwareCommand(cmd="DENY"))

        # 3. Create Log Entry via LogService
        log_entry = await log_service.create_access_log(
            user_name=user_name, rfid=msg.rfid, action=decision, is_duress=msg.is_duress, temperature=msg.temperature
        )

        # 4. Notify Frontend
        await self.broadcast_to_frontend(
            schemas.BroadcastMessage(
                type="ACCESS_LOG",
                data={
                    "id": log_entry.id,
                    "user_name": log_entry.user_name,
                    "action": log_entry.action,
                    "timestamp": log_entry.timestamp.isoformat(),
                    "is_duress": log_entry.is_duress,
                    "temperature": log_entry.temperature,
                    "avatar_url": user.avatar_url if user else None,
                },
            )
        )

        # 5. Unknown Tag Alert
        if not user:
            await self.broadcast_to_frontend(
                schemas.BroadcastMessage(type="UNKNOWN_TAG", uid=msg.rfid, timestamp=log_entry.timestamp.isoformat())
            )

    async def process_frontend_message(self, raw_data: dict, db: AsyncSession):
        try:
            msg = schemas.FrontendMessage(**raw_data)
        except Exception as e:
            logger.error(f"Invalid frontend message: {e}")
            return

        log_service = LogService(db)

        if msg.cmd == "OPEN":
            logger.info("Remote OPEN command received")
            await self.send_to_hardware(schemas.HardwareCommand(cmd="OPEN"))

            # Log Manual Override via LogService
            log_entry = await log_service.create_access_log(
                user_name="Remote Admin", rfid="MANUAL_OVERRIDE", action="GRANTED", is_duress=False, temperature=None
            )

            await self.broadcast_to_frontend(
                schemas.BroadcastMessage(
                    type="ACCESS_LOG",
                    data={
                        "id": log_entry.id,
                        "user_name": log_entry.user_name,
                        "action": log_entry.action,
                        "timestamp": log_entry.timestamp.isoformat(),
                        "is_duress": False,
                        "temperature": None,
                        "avatar_url": None,
                    },
                )
            )


manager = ConnectionManager()
