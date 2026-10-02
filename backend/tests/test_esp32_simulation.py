"""
ESP32 Microcontroller Simulation Tests
Tests: Hardware Protocol, RFID Processing, Relay Commands, Telemetry, Error Scenarios
Simulates real ESP32 behavior to validate backend handling
"""

import time
from datetime import datetime

import pytest
from starlette.testclient import TestClient

# =============================================================================
# ESP32 MESSAGE PROTOCOL TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_esp32_scan_message_format():
    """Test correct ESP32 scan message format is accepted"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            # Standard ESP32 scan message format
            message = {"type": "scan", "uid": "04A3B2C1D4", "timestamp": datetime.now().isoformat()}
            ws.send_json(message)
            # Should not cause error
            ws.close()


@pytest.mark.asyncio
async def test_esp32_telemetry_message_format():
    """Test correct ESP32 telemetry message format is accepted"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            # Standard ESP32 telemetry message
            message = {
                "type": "telemetry",
                "temperature": 23.5,
                "humidity": 45.0,  # Optional field
                "timestamp": datetime.now().isoformat(),
            }
            ws.send_json(message)
            ws.close()


@pytest.mark.asyncio
async def test_esp32_ping_message():
    """Test ESP32 ping message receives pong response"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            ws.send_json({"type": "ping"})
            response = ws.receive_json()
            assert response.get("cmd") == "PONG"


@pytest.mark.asyncio
async def test_esp32_status_message():
    """Test ESP32 can send status updates"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            status = {"type": "status", "relay_state": "open", "uptime": 3600, "firmware_version": "1.2.0"}
            ws.send_json(status)


# =============================================================================
# RFID PROCESSING SIMULATION
# =============================================================================


@pytest.mark.asyncio
async def test_esp32_registered_user_scan(client):
    """Test ESP32 scanning a registered user's card"""
    from app.main import app

    # First create a user
    user_data = {"name": "ESP Test User", "rfid_tag": "ESP_REG_001", "role": "admin"}
    await client.post("/users/", json=user_data)

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            # Simulate scan
            ws.send_json({"type": "scan", "uid": "ESP_REG_001", "timestamp": datetime.now().isoformat()})

            # Should receive OPEN command
            response = ws.receive_json()
            assert response.get("cmd") == "OPEN" or response.get("action") == "OPEN" or "OPEN" in str(response)


@pytest.mark.asyncio
async def test_esp32_unregistered_card_scan(client):
    """Test ESP32 scanning an unknown/unregistered card"""
    from app.main import app

    with TestClient(app) as test_client:
        # Connect frontend and hardware simultaneously to receive broadcast
        with (
            test_client.websocket_connect("/ws/frontend") as frontend,
            test_client.websocket_connect("/ws/hardware") as hw,
        ):
            # Scan unknown card
            hw.send_json({"type": "scan", "uid": "UNKNOWN_CARD_XYZ123", "timestamp": datetime.now().isoformat()})
            hw_response = hw.receive_json()
            assert hw_response.get("cmd") == "DENY"

            # Frontend should receive UNKNOWN_TAG notification
            response = frontend.receive_json()
            if response.get("type") == "ACCESS_LOG":
                response = frontend.receive_json()
            assert response.get("type") in ["UNKNOWN_TAG", "ACCESS_LOG"]


@pytest.mark.asyncio
async def test_esp32_rapid_scans():
    """Test ESP32 sending rapid consecutive scans (debounce handling)"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            # Send 5 rapid scans of same card
            for _ in range(5):
                ws.send_json({"type": "scan", "uid": "RAPID_SCAN_001", "timestamp": datetime.now().isoformat()})
            # Should not crash server


# =============================================================================
# RELAY COMMAND HANDLING
# =============================================================================


@pytest.mark.asyncio
async def test_esp32_receives_open_command():
    """Test ESP32 receives OPEN command from frontend"""
    from app.main import app

    with TestClient(app) as test_client:
        with (
            test_client.websocket_connect("/ws/hardware") as hw,
            test_client.websocket_connect("/ws/frontend") as frontend,
        ):
            # Frontend sends OPEN command
            frontend.send_json({"cmd": "OPEN"})
            response = hw.receive_json()
            assert "OPEN" in str(response).upper()


@pytest.mark.asyncio
async def test_esp32_relay_status_update():
    """Test ESP32 can report relay status changes"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            # Report relay opened
            ws.send_json({"type": "relay_status", "state": "open", "timestamp": datetime.now().isoformat()})

            # Report relay closed after delay
            ws.send_json({"type": "relay_status", "state": "closed", "timestamp": datetime.now().isoformat()})


# =============================================================================
# TELEMETRY AND SENSOR DATA
# =============================================================================


@pytest.mark.asyncio
async def test_esp32_temperature_telemetry():
    """Test temperature data from DS18B20 sensor"""
    from app.main import app

    with TestClient(app) as test_client:
        with (
            test_client.websocket_connect("/ws/frontend") as frontend,
            test_client.websocket_connect("/ws/hardware") as hw,
        ):
            # Send temperature reading
            hw.send_json({"type": "telemetry", "temperature": 25.75, "timestamp": datetime.now().isoformat()})
            response = frontend.receive_json()
            if response.get("type") == "ACCESS_LOG":
                response = frontend.receive_json()
            assert response.get("type") == "TELEMETRY"
            assert "temperature" in response.get("data", {})


@pytest.mark.asyncio
async def test_esp32_temperature_edge_cases():
    """Test edge case temperature values"""
    from app.main import app

    edge_temps = [
        -55.0,  # DS18B20 minimum
        125.0,  # DS18B20 maximum
        0.0,  # Freezing
        36.5,  # Body temperature
    ]

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            for temp in edge_temps:
                ws.send_json({"type": "telemetry", "temperature": temp, "timestamp": datetime.now().isoformat()})


# =============================================================================
# ERROR AND RECOVERY SCENARIOS
# =============================================================================


@pytest.mark.asyncio
async def test_esp32_reconnection():
    """Test ESP32 can reconnect after disconnection"""
    from app.main import app

    with TestClient(app) as test_client:
        # First connection
        with test_client.websocket_connect("/ws/hardware") as ws1:
            ws1.send_json({"type": "ping"})

        # Reconnection
        with test_client.websocket_connect("/ws/hardware") as ws2:
            ws2.send_json({"type": "ping"})
            # Should work fine


@pytest.mark.asyncio
async def test_esp32_malformed_message():
    """Test backend handles malformed ESP32 messages gracefully"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            # Send malformed JSON
            ws.send_text("not valid json {{{")
            # Server should handle without crashing


@pytest.mark.asyncio
async def test_esp32_missing_fields():
    """Test handling of messages with missing required fields"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            # Scan without uid
            ws.send_json({"type": "scan"})

            # Telemetry without temperature
            ws.send_json({"type": "telemetry"})

            # Should handle gracefully


@pytest.mark.asyncio
async def test_esp32_invalid_message_type():
    """Test handling of unknown message types"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            ws.send_json({"type": "unknown_type_xyz", "data": "something"})
            # Should ignore or handle gracefully


# =============================================================================
# PERFORMANCE AND TIMING
# =============================================================================


@pytest.mark.asyncio
async def test_esp32_response_latency():
    """Test response latency for RFID scan is acceptable"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            start = time.time()
            ws.send_json({"type": "scan", "uid": "LATENCY_TEST_001", "timestamp": datetime.now().isoformat()})
            response = ws.receive_json()
            latency = (time.time() - start) * 1000  # ms
            assert latency < 500, f"Latency {latency}ms too high"
            assert response.get("cmd") == "DENY"


@pytest.mark.asyncio
async def test_esp32_message_throughput():
    """Test backend handles high message throughput"""
    from app.main import app

    with TestClient(app) as test_client:
        with test_client.websocket_connect("/ws/hardware") as ws:
            # Send 20 messages rapidly
            for i in range(20):
                ws.send_json(
                    {"type": "telemetry", "temperature": 20.0 + i * 0.1, "timestamp": datetime.now().isoformat()}
                )
            # Should handle all without error
