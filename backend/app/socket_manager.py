from fastapi import WebSocket
from typing import List, Dict, Any
import json
import logging
from sqlalchemy import select
from .database import SessionLocal
from .models import User, AccessLog

logger = logging.getLogger("uvicorn")

class ConnectionManager:
    def __init__(self):
        # Keep track of active connections
        self.hardware_clients: List[WebSocket] = []
        self.frontend_clients: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, client_type: str):
        await websocket.accept()
        if client_type == "hardware":
            self.hardware_clients.append(websocket)
            logger.info("Hardware client connected.")
        elif client_type == "frontend":
            self.frontend_clients.append(websocket)
            logger.info("Frontend client connected.")

    def disconnect(self, websocket: WebSocket, client_type: str):
        if client_type == "hardware":
            if websocket in self.hardware_clients:
                self.hardware_clients.remove(websocket)
                logger.info("Hardware client disconnected.")
        elif client_type == "frontend":
            if websocket in self.frontend_clients:
                self.frontend_clients.remove(websocket)
                logger.info("Frontend client disconnected.")

    async def broadcast_to_frontend(self, message: Dict[str, Any]):
        """Send a message to all connected frontend clients."""
        for connection in self.frontend_clients:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to frontend: {e}")

    async def send_to_hardware(self, message: Dict[str, Any]):
        """Send a message to all connected hardware clients (usually just one config)."""
        for connection in self.hardware_clients:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to hardware: {e}")

    async def process_hardware_message(self, data: dict):
        """
        Core Business Logic:
        1. Receive scan data from Hardware.
        2. Check DB for User.
        3. Send Open/Deny to Hardware.
        4. Log to DB.
        5. Broadcast to Frontend.
        """
        rfid = data.get("rfid")
        temperature = data.get("temperature")
        is_duress = data.get("is_duress", False)

        if not rfid:
            return

        async with SessionLocal() as db:
            # Check if user exists
            result = await db.execute(select(User).where(User.rfid_tag == rfid))
            user = result.scalar_one_or_none()

            log_entry = None

            if user:
                # SCENARIO A: Authorized
                logger.info(f"Access GRANTED for user: {user.name}")
                
                # 1. Send OPEN to Hardware
                await self.send_to_hardware({"cmd": "OPEN"})

                # 2. Log GRANTED
                log_entry = AccessLog(
                    user_name=user.name,
                    action="GRANTED",
                    is_duress=is_duress,
                    temperature=temperature
                )
                db.add(log_entry)
                await db.commit()
                await db.refresh(log_entry)

                # 3. Broadcast ACCESS_LOG to Frontend
                await self.broadcast_to_frontend({
                    "type": "ACCESS_LOG",
                    "data": {
                        "id": log_entry.id,
                        "user_name": log_entry.user_name,
                        "action": log_entry.action,
                        "timestamp": log_entry.timestamp.isoformat(),
                        "is_duress": log_entry.is_duress,
                        "temperature": log_entry.temperature,
                        "avatar_url": user.avatar_url
                    }
                })

            else:
                # SCENARIO B: Unknown Tag
                logger.info(f"Access DENIED for tag: {rfid}")

                # 1. Send DENY to Hardware
                await self.send_to_hardware({"cmd": "DENY"})

                # 2. Log DENIED
                log_entry = AccessLog(
                    user_name="Unknown",
                    action="DENIED",
                    is_duress=is_duress,
                    temperature=temperature
                )
                db.add(log_entry)
                await db.commit()
                await db.refresh(log_entry)

                # 3. Broadcast UNKNOWN_TAG to Frontend (for Live Registration)
                await self.broadcast_to_frontend({
                    "type": "UNKNOWN_TAG",
                    "uid": rfid,
                    "timestamp": log_entry.timestamp.isoformat()
                })
                
                # Also broadcast the log entry so it appears in the logs immediately
                await self.broadcast_to_frontend({
                    "type": "ACCESS_LOG",
                    "data": {
                        "id": log_entry.id,
                        "user_name": log_entry.user_name,
                        "action": log_entry.action,
                        "timestamp": log_entry.timestamp.isoformat(),
                        "is_duress": log_entry.is_duress,
                        "temperature": log_entry.temperature,
                        "avatar_url": None
                    }
                })

manager = ConnectionManager()
