"""WebSocket auth and door processor protocol tests (pure async ASGI, zero thread leaks)."""

import json
import os
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, patch

import anyio
import pytest
from httpx import AsyncClient
from sqlalchemy import select

os.environ["HARDWARE_TOKEN"] = "test-hardware-token"
os.environ.setdefault("SEED_DEFAULT_ADMIN", "true")


class _ASGIWebSocket:
    def __init__(self, in_send, out_recv):
        self._in_send = in_send
        self._out_recv = out_recv
        self.close_code = None

    async def send_json(self, data: dict) -> None:
        await self._in_send.send({"type": "websocket.receive", "text": json.dumps(data)})

    async def receive_json(self) -> dict:
        with anyio.fail_after(5):
            msg = await self._out_recv.receive()
        if msg["type"] == "websocket.close":
            self.close_code = msg.get("code", 1000)
            raise RuntimeError(f"websocket closed: {self.close_code}")
        return json.loads(msg["text"])

    async def wait_closed(self) -> int:
        with anyio.fail_after(5):
            while True:
                msg = await self._out_recv.receive()
                if msg["type"] == "websocket.close":
                    return int(msg.get("code", 1000))


@asynccontextmanager
async def _open_ws(asgi_app, path: str, query: str = ""):
    in_send, in_recv = anyio.create_memory_object_stream(32)
    out_send, out_recv = anyio.create_memory_object_stream(32)
    scope = {
        "type": "websocket",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "scheme": "ws",
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": query.encode("ascii"),
        "headers": [],
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }

    async with anyio.create_task_group() as tg:
        tg.start_soon(asgi_app, scope, in_recv.receive, out_send.send)
        await in_send.send({"type": "websocket.connect"})
        with anyio.fail_after(5):
            first = await out_recv.receive()
        assert first["type"] == "websocket.accept"
        session = _ASGIWebSocket(in_send, out_recv)
        try:
            yield session
        finally:
            try:
                await in_send.send({"type": "websocket.disconnect", "code": 1000})
                await in_send.aclose()
            except Exception:
                pass
            await anyio.sleep(0.05)
            await out_recv.aclose()
            tg.cancel_scope.cancel()


def _wire_ws_db():
    from app.main import app

    return app


@pytest.mark.asyncio
async def test_websocket_frontend_rejects_without_token(client: AsyncClient):
    app = _wire_ws_db()
    async with _open_ws(app, "/ws/frontend") as ws:
        assert await ws.wait_closed() == 4401

    async with _open_ws(app, "/ws/frontend", "token=not-a-valid-jwt") as ws:
        assert await ws.wait_closed() == 4401


@pytest.mark.asyncio
async def test_websocket_hardware_rejects_without_token(client: AsyncClient):
    app = _wire_ws_db()
    async with _open_ws(app, "/ws/hardware") as ws:
        assert await ws.wait_closed() == 4401

    async with _open_ws(app, "/ws/hardware", "token=wrong-secret") as ws:
        assert await ws.wait_closed() == 4401


@pytest.mark.asyncio
async def test_anonymous_cannot_open_via_ws(client: AsyncClient):
    from app.services.processor import manager

    app = _wire_ws_db()
    with patch.object(manager, "send_to_hardware", new=AsyncMock()) as mocked_hw:
        async with _open_ws(app, "/ws/frontend") as ws:
            await ws.send_json({"cmd": "OPEN"})
            assert await ws.wait_closed() == 4401
        mocked_hw.assert_not_called()


@pytest.mark.asyncio
async def test_hardware_ping_returns_pong_over_ws(client: AsyncClient):
    app = _wire_ws_db()
    async with _open_ws(app, "/ws/hardware", "token=test-hardware-token") as ws:
        await ws.send_json({"type": "ping"})
        reply = await ws.receive_json()
        assert reply == {"cmd": "PONG"}


@pytest.mark.asyncio
async def test_frontend_ws_ticket_connects_and_opens(client: AsyncClient, db_session):
    from app import models
    from app.services.processor import manager

    app = _wire_ws_db()
    db_session.add(models.SystemSettings(key="auto_lock_start", value="0"))
    db_session.add(models.SystemSettings(key="auto_lock_end", value="0"))
    db_session.add(models.SystemSettings(key="timer_duration", value="5"))
    await db_session.commit()

    login = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert login.status_code == 200
    jwt_token = login.json()["access_token"]
    ticket_resp = await client.post(
        "/auth/ws-ticket",
        headers={"Authorization": f"Bearer {jwt_token}"},
    )
    assert ticket_resp.status_code == 200
    ticket = ticket_resp.json()["ticket"]

    async with _open_ws(app, "/ws/hardware", "token=test-hardware-token") as hw_ws:
        async with _open_ws(app, "/ws/frontend", f"ticket={ticket}") as fe_ws:
            manager._last_open_at = 0.0
            await fe_ws.send_json({"cmd": "OPEN"})
            hw_cmd = await hw_ws.receive_json()
            assert hw_cmd["cmd"] == "OPEN"
            assert hw_cmd["duration"] == 5
            fe_msg = await fe_ws.receive_json()
            assert fe_msg["type"] == "ACCESS_LOG"
            assert fe_msg["data"]["action"] == "GRANTED"


@pytest.mark.asyncio
async def test_known_rfid_scan_grants_open_with_dynamic_timer(client: AsyncClient, db_session):
    """Processor grants OPEN with configured timer_duration for registered RFID."""
    from app import models, schemas
    from app.services.processor import manager

    db_session.add(models.User(name="RFID User", rfid_tag="ABCD1234EF", role="user"))
    db_session.add(models.SystemSettings(key="auto_lock_start", value="0"))
    db_session.add(models.SystemSettings(key="auto_lock_end", value="0"))
    db_session.add(models.SystemSettings(key="timer_duration", value="12"))
    await db_session.commit()

    sent = []

    async def capture(cmd, role="door", device_id=None):
        sent.append(cmd)

    with patch.object(manager, "send_to_hardware", new=AsyncMock(side_effect=capture)):
        with patch.object(manager, "broadcast_to_frontend", new=AsyncMock()):
            await manager._handle_scan(
                schemas.HardwareMessage(type="scan", rfid="0xabcd1234ef", temperature=24.0),
                db_session,
            )

    assert len(sent) == 1
    assert sent[0].cmd == "OPEN"
    assert sent[0].duration == 12


@pytest.mark.asyncio
async def test_unknown_rfid_scan_denies_and_broadcasts_unknown_tag(client: AsyncClient, db_session):
    from app import models, schemas
    from app.services.processor import manager

    db_session.add(models.SystemSettings(key="auto_lock_start", value="0"))
    db_session.add(models.SystemSettings(key="auto_lock_end", value="0"))
    await db_session.commit()

    sent = []
    broadcasts = []

    async def capture_hw(cmd, role="door", device_id=None):
        sent.append(cmd)

    async def capture_fe(msg):
        broadcasts.append(msg)

    with patch.object(manager, "send_to_hardware", new=AsyncMock(side_effect=capture_hw)):
        with patch.object(manager, "broadcast_to_frontend", new=AsyncMock(side_effect=capture_fe)):
            await manager._handle_scan(
                schemas.HardwareMessage(type="scan", rfid="UNKNOWN999", temperature=22.0),
                db_session,
            )

    assert len(sent) == 1
    assert sent[0].cmd == "DENY"
    types = [b.type for b in broadcasts]
    assert "ACCESS_LOG" in types
    assert "UNKNOWN_TAG" in types
    unknown_msg = next(b for b in broadcasts if b.type == "UNKNOWN_TAG")
    assert unknown_msg.uid == "UNKNOWN999"


@pytest.mark.asyncio
async def test_local_decision_avoids_duplicate_hardware_cmd_and_handles_duress(
    client: AsyncClient, db_session
):
    from app import models, schemas
    from app.services.processor import manager

    db_session.add(models.User(name="Local User", rfid_tag="LOC112233", role="user"))
    db_session.add(models.SystemSettings(key="alert_phone", value="09120000001"))
    await db_session.commit()

    hw_calls = []
    fe_calls = []

    with (
        patch.object(
            manager,
            "send_to_hardware",
            new=AsyncMock(side_effect=lambda c, **kw: hw_calls.append(c)),
        ),
        patch.object(
            manager,
            "broadcast_to_frontend",
            new=AsyncMock(side_effect=lambda m: fe_calls.append(m)),
        ),
        patch(
            "app.services.alert_sms.send_alert_sms", new=AsyncMock(return_value=True)
        ) as sms_mock,
    ):
        await manager._handle_scan(
            schemas.HardwareMessage(
                type="scan",
                rfid="LOC112233",
                temperature=25.0,
                is_duress=True,
                local_decision="GRANTED",
            ),
            db_session,
        )
        await manager._handle_scan(
            schemas.HardwareMessage(
                type="scan",
                rfid="STRANGER777",
                temperature=24.0,
                is_duress=False,
                local_decision="DENIED",
            ),
            db_session,
        )

    assert hw_calls == []
    sms_mock.assert_awaited_once()
    assert [m.type for m in fe_calls] == ["ACCESS_LOG", "ACCESS_LOG", "UNKNOWN_TAG"]

    logs = (
        (await db_session.execute(select(models.AccessLog).order_by(models.AccessLog.id)))
        .scalars()
        .all()
    )
    assert len(logs) == 2
    assert logs[0].action == "GRANTED" and logs[0].is_duress is True
    assert logs[1].action == "DENIED" and logs[1].rfid_tag == "STRANGER777"


@pytest.mark.asyncio
async def test_duress_mode_false_disables_duress_rfid(client: AsyncClient, db_session):
    from app import models, schemas
    from app.services.processor import manager

    db_session.add(models.SystemSettings(key="auto_lock_start", value="0"))
    db_session.add(models.SystemSettings(key="auto_lock_end", value="0"))
    db_session.add(models.SystemSettings(key="duress_mode", value="false"))
    db_session.add(models.SystemSettings(key="duress_rfid", value="DURESS99"))
    await db_session.commit()

    sent = []
    with (
        patch.object(
            manager, "send_to_hardware", new=AsyncMock(side_effect=lambda c, **kw: sent.append(c))
        ),
        patch.object(manager, "broadcast_to_frontend", new=AsyncMock()),
    ):
        await manager._handle_scan(
            schemas.HardwareMessage(type="scan", rfid="DURESS99"),
            db_session,
        )

    assert len(sent) == 1
    assert sent[0].cmd == "DENY"


@pytest.mark.asyncio
async def test_deleted_tag_denies(client: AsyncClient, db_session):
    """Gate I: after user/tag removal, scan must DENY."""
    from sqlalchemy import delete

    from app import models, schemas
    from app.services.processor import manager

    user = models.User(name="Temp", rfid_tag="TEMPTAG01", role="user")
    db_session.add(user)
    db_session.add(models.SystemSettings(key="auto_lock_start", value="0"))
    db_session.add(models.SystemSettings(key="auto_lock_end", value="0"))
    await db_session.commit()

    await db_session.execute(delete(models.User).where(models.User.rfid_tag == "TEMPTAG01"))
    await db_session.commit()

    sent = []

    async def capture(cmd, role="door", device_id=None):
        sent.append(cmd)

    with patch.object(manager, "send_to_hardware", new=AsyncMock(side_effect=capture)):
        with patch.object(manager, "broadcast_to_frontend", new=AsyncMock()):
            await manager._handle_scan(
                schemas.HardwareMessage(type="scan", rfid="TEMPTAG01"),
                db_session,
            )

    assert sent[0].cmd == "DENY"


@pytest.mark.asyncio
async def test_open_cooldown(client: AsyncClient, db_session):
    from app.services.processor import manager

    manager._last_open_at = 0.0
    calls = []

    async def capture(cmd, role="door", device_id=None):
        calls.append(cmd)

    with patch.object(manager, "send_to_hardware", new=AsyncMock(side_effect=capture)):
        assert await manager._open_with_cooldown() is True
        assert await manager._open_with_cooldown() is False
    assert len(calls) == 1
    assert calls[0].cmd == "OPEN"
