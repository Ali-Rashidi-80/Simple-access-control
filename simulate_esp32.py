"""Local ESP32 WebSocket hardware simulator for manual smoke testing."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

try:
    import websockets
except ImportError:  # pragma: no cover - runtime dependency check
    websockets = None

DEFAULT_WS_URL = "ws://127.0.0.1:8000/ws/hardware"


def build_ws_uri(base_url: str, hardware_token: str) -> tuple[str, str]:
    """Return (connect_uri, redacted_uri) with ?token=... appended when provided."""
    parts = urlsplit(base_url)
    if parts.scheme not in ("ws", "wss") or not parts.netloc:
        raise ValueError(f"Invalid WS_URL (expected ws:// or wss://): {base_url!r}")

    query = parse_qsl(parts.query, keep_blank_values=True)
    has_token = any(k == "token" and v for k, v in query)
    if not has_token and hardware_token:
        query.append(("token", hardware_token))

    connect_uri = urlunsplit(
        (parts.scheme, parts.netloc, parts.path or "/ws/hardware", urlencode(query), "")
    )
    redacted_query = [
        (k, "***" if k == "token" else v) for k, v in query
    ]
    redacted_uri = urlunsplit(
        (parts.scheme, parts.netloc, parts.path or "/ws/hardware", urlencode(redacted_query), "")
    )
    return connect_uri, redacted_uri


async def simulate_hardware() -> int:
    """Connect to the door WebSocket endpoint, emit telemetry + scan, and wait for a decision."""
    base_url = os.environ.get("WS_URL", DEFAULT_WS_URL).strip() or DEFAULT_WS_URL
    hardware_token = os.environ.get("HARDWARE_TOKEN", "").strip()
    rfid_tag = os.environ.get("SIMULATE_RFID", "TEST_TAG_001").strip() or "TEST_TAG_001"

    raw_temp = os.environ.get("SIMULATE_TEMP", "25.0").strip() or "25.0"
    try:
        temperature = float(raw_temp)
    except ValueError:
        print(f"ERROR: Invalid SIMULATE_TEMP value: {raw_temp!r}", file=sys.stderr)
        return 2

    try:
        connect_uri, redacted_uri = build_ws_uri(base_url, hardware_token)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    if "token=" not in connect_uri:
        print(
            "ERROR: HARDWARE_TOKEN environment variable (or ?token= in WS_URL) is required.",
            file=sys.stderr,
        )
        return 2

    if websockets is None:
        print(
            "ERROR: 'websockets' package is required to run simulate_esp32.py.",
            file=sys.stderr,
        )
        return 2

    print(f"Connecting to {redacted_uri}...")
    try:
        async with websockets.connect(connect_uri, open_timeout=10) as websocket:
            print("Connected to backend hardware WebSocket.")

            telemetry_msg = {"type": "telemetry", "temperature": temperature}
            await websocket.send(json.dumps(telemetry_msg))
            print(f"Sent telemetry: {telemetry_msg}")

            scan_msg = {"type": "scan", "rfid": rfid_tag, "temperature": temperature}
            await websocket.send(json.dumps(scan_msg))
            print(f"Sent scan: {scan_msg}")

            while True:
                try:
                    raw_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                except asyncio.TimeoutError:
                    print("Timed out waiting for hardware command from backend.", file=sys.stderr)
                    return 1

                print(f"Received frame: {raw_response}")
                try:
                    payload = json.loads(raw_response)
                except json.JSONDecodeError:
                    continue

                cmd = payload.get("cmd")
                if cmd in ("OPEN", "DENY"):
                    print(f"Decision received: {cmd}")
                    return 0
    except websockets.exceptions.WebSocketException as exc:
        print(f"WebSocket error: {exc}", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"Network connection failed: {exc}", file=sys.stderr)
        return 1


def main() -> int:
    try:
        return asyncio.run(simulate_hardware())
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
