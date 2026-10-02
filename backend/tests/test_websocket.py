"""
Comprehensive WebSocket Tests for SentryGate Backend
Tests: Hardware Connection, Frontend Connection, RFID Scan Processing, Commands, Keep-Alive
"""

import time

import pytest
from app.main import app
from httpx import AsyncClient
from starlette.testclient import TestClient


async def get_auth_headers(client: AsyncClient) -> dict[str, str]:
    """Login and return auth headers"""
    response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# --- WEBSOCKET CONNECTION TESTS ---


@pytest.mark.asyncio
async def test_websocket_frontend_connection(client: AsyncClient):
    """Test frontend WebSocket connection establishes correctly"""
    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/frontend") as websocket:
            websocket.close()


@pytest.mark.asyncio
async def test_websocket_hardware_connection(client: AsyncClient):
    """Test hardware (ESP32) WebSocket connection establishes correctly"""
    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as websocket:
            websocket.close()


# --- RFID SCAN SIMULATION TESTS ---


@pytest.mark.asyncio
async def test_known_rfid_scan_grants_access(client: AsyncClient):
    """Test scanning a registered RFID tag grants access"""
    headers = await get_auth_headers(client)
    user_data = {"name": "Test RFID User", "rfid_tag": "ABCD1234EF", "role": "admin"}
    create_response = await client.post("/users/", json=user_data, headers=headers)
    assert create_response.status_code == 200

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as hw_ws:
            scan_message = {"type": "scan", "rfid": "ABCD1234EF", "timestamp": "2024-12-11T10:00:00"}
            hw_ws.send_json(scan_message)
            response = hw_ws.receive_json()
            assert response.get("cmd") == "OPEN" or response.get("action") == "OPEN"


@pytest.mark.asyncio
async def test_unknown_rfid_scan_triggers_notification(client: AsyncClient):
    """Test scanning an unknown RFID tag triggers UNKNOWN_TAG broadcast"""
    with TestClient(app) as test_client:
        with (
            test_client.websocket_connect("/ws/frontend") as frontend_ws,
            test_client.websocket_connect("/ws/hardware") as hw_ws,
        ):
            scan_message = {"type": "scan", "rfid": "UNKNOWN_TAG_XYZ", "timestamp": "2024-12-11T10:00:00"}
            hw_ws.send_json(scan_message)
            hw_response = hw_ws.receive_json()
            assert hw_response.get("cmd") == "DENY"

            response = frontend_ws.receive_json()
            if response.get("type") == "ACCESS_LOG":
                response = frontend_ws.receive_json()
            assert response.get("type") in ["UNKNOWN_TAG", "ACCESS_LOG"]


@pytest.mark.asyncio
async def test_telemetry_broadcast_to_frontend(client: AsyncClient):
    """Test temperature telemetry from ESP32 broadcasts to frontend"""
    with TestClient(app) as test_client:
        with (
            test_client.websocket_connect("/ws/frontend") as frontend_ws,
            test_client.websocket_connect("/ws/hardware") as hw_ws,
        ):
            telemetry = {"type": "telemetry", "temperature": 25.5, "timestamp": "2024-12-11T10:00:00"}
            hw_ws.send_json(telemetry)
            response = frontend_ws.receive_json()
            assert response.get("type") == "TELEMETRY"
            assert response.get("data", {}).get("temperature") == 25.5


@pytest.mark.asyncio
async def test_frontend_open_command(client: AsyncClient):
    """Test frontend can send OPEN command to hardware"""
    with TestClient(app) as test_client:
        with (
            test_client.websocket_connect("/ws/frontend") as frontend_ws,
            test_client.websocket_connect("/ws/hardware") as hw_ws,
        ):
            frontend_ws.send_json({"cmd": "OPEN"})
            response = hw_ws.receive_json()
            assert response.get("cmd") == "OPEN" or response.get("action") == "OPEN"


# --- ACCESS LOG CREATION TESTS ---


@pytest.mark.asyncio
async def test_access_log_created_on_valid_scan(client: AsyncClient):
    """Test that a valid RFID scan creates an access log entry"""
    headers = await get_auth_headers(client)
    user_data = {"name": "Log Test User", "rfid_tag": "LOG_TEST_123", "role": "user"}
    await client.post("/users/", json=user_data, headers=headers)

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as hw_ws:
            hw_ws.send_json({"type": "scan", "rfid": "LOG_TEST_123", "temperature": 36.6})
            resp = hw_ws.receive_json()
            assert resp.get("cmd") == "OPEN"
            time.sleep(0.2)

    after_logs = await client.get("/logs/?limit=100", headers=headers)
    assert after_logs.status_code == 200
    data = after_logs.json()
    logs = data.get("logs", data) if isinstance(data, dict) else data
    assert any(log.get("rfid_tag") == "LOG_TEST_123" or log.get("user_name") == "Log Test User" for log in logs)


@pytest.mark.asyncio
async def test_duress_flag_in_logs(client: AsyncClient):
    """Test that duress flag is properly recorded in logs"""
    headers = await get_auth_headers(client)
    logs_response = await client.get("/logs/?limit=50", headers=headers)
    assert logs_response.status_code == 200

    data = logs_response.json()
    logs = data.get("logs", data) if isinstance(data, dict) else data
    if len(logs) > 0:
        log = logs[0]
        assert "is_duress" in log or "isDuress" in log


# --- TIMING AND PERFORMANCE TESTS ---


@pytest.mark.asyncio
async def test_websocket_response_time():
    """Test WebSocket ping response time is under 500ms and receives PONG"""
    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            start = time.time()
            ws.send_json({"type": "ping"})
            response = ws.receive_json()
            elapsed = (time.time() - start) * 1000  # ms
            assert elapsed < 500, f"Response time {elapsed}ms > 500ms"
            assert response.get("cmd") == "PONG"


@pytest.mark.asyncio
async def test_concurrent_websocket_connections():
    """Test multiple simultaneous WebSocket connections"""
    connections = []
    with TestClient(app) as test_client:
        for _ in range(3):
            ws = test_client.websocket_connect("/ws/frontend")
            ws.__enter__()
            connections.append(ws)

        assert len(connections) == 3, "Should support multiple connections"

        for ws in connections:
            ws.__exit__(None, None, None)


# --- ERROR HANDLING TESTS ---


@pytest.mark.asyncio
async def test_invalid_websocket_message():
    """Test handling of invalid WebSocket message format without server crash"""
    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            ws.send_text("not valid json {{{")
            ws.close()


@pytest.mark.asyncio
async def test_empty_rfid_scan():
    """Test handling of empty RFID tag in scan"""
    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            ws.send_json({"type": "scan", "rfid": ""})
            ws.close()
