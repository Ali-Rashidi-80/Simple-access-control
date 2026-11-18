"""ESP32 Microcontroller Simulation Tests over async ASGI WebSocket."""

import os
from datetime import datetime

import pytest
from httpx import AsyncClient

from tests.test_websocket import _open_ws, _wire_ws_db

os.environ["HARDWARE_TOKEN"] = "test-hardware-token"


def _fe_token() -> str:
    from app.services.security import create_access_token

    return create_access_token({"sub": "admin", "role": "admin"})


@pytest.mark.asyncio
async def test_esp32_scan_and_telemetry_protocol(client: AsyncClient):
    """Test standard ESP32 scan, telemetry, status, and ping messages over WS."""
    app = _wire_ws_db()
    async with _open_ws(app, "/ws/hardware", "token=test-hardware-token") as ws:
        await ws.send_json({"type": "ping"})
        assert await ws.receive_json() == {"cmd": "PONG"}

        await ws.send_json(
            {
                "type": "telemetry",
                "temperature": 23.5,
                "timestamp": datetime.now().isoformat(),
            }
        )
        await ws.send_json(
            {
                "type": "status",
                "relay_state": "closed",
                "uptime": 3600,
            }
        )
        await ws.send_json(
            {
                "type": "scan",
                "rfid": "04A3B2C1D4",
                "temperature": 23.5,
            }
        )
        cmd = await ws.receive_json()
        assert cmd["cmd"] == "DENY"


@pytest.mark.asyncio
async def test_esp32_registered_user_scan_and_frontend_broadcast(client: AsyncClient):
    """Registered RFID triggers OPEN and broadcasts ACCESS_LOG to frontend."""
    app = _wire_ws_db()
    login = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    await client.put(
        "/settings/",
        json={"settings": {"auto_lock_start": "0", "auto_lock_end": "0", "timer_duration": "7"}},
        headers=headers,
    )
    create_resp = await client.post(
        "/users/",
        json={"name": "ESP Test User", "rfid_tag": "ESP_REG_001", "role": "user"},
        headers=headers,
    )
    assert create_resp.status_code == 200

    async with _open_ws(app, "/ws/frontend", f"token={_fe_token()}") as frontend:
        async with _open_ws(app, "/ws/hardware", "token=test-hardware-token") as hw:
            await hw.send_json({"type": "scan", "rfid": "ESP_REG_001", "temperature": 25.2})
            hw_cmd = await hw.receive_json()
            assert hw_cmd["cmd"] == "OPEN"
            assert hw_cmd["duration"] == 7

            fe_event = await frontend.receive_json()
            assert fe_event["type"] == "ACCESS_LOG"
            assert fe_event["data"]["user_name"] == "ESP Test User"
            assert fe_event["data"]["action"] == "GRANTED"


@pytest.mark.asyncio
async def test_esp32_malformed_and_unknown_messages_do_not_crash(client: AsyncClient):
    """Malformed/unknown WS payloads should be handled without dropping server health."""
    app = _wire_ws_db()
    async with _open_ws(app, "/ws/hardware", "token=test-hardware-token") as ws:
        await ws.send_json({"type": "scan"})
        await ws.send_json({"type": "telemetry"})
        await ws.send_json({"type": "unknown_type_xyz", "data": "ignored"})
        await ws.send_json({"type": "ping"})
        assert await ws.receive_json() == {"cmd": "PONG"}
