"""Hardware allowlist, temporary PIN, PIN clear, and offline hardware events API tests."""

import asyncio
import os
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

os.environ.setdefault("HARDWARE_TOKEN", "test-hardware-token")
os.environ.setdefault("PIN_PEPPER", "test-pin-pepper")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-for-pytest-32b")


async def _admin_headers(client: AsyncClient) -> dict[str, str]:
    login = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.asyncio
async def test_allowlist_requires_token(client: AsyncClient):
    r = await client.get("/api/hardware/allowlist")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_allowlist_payload_fields_and_duress_mode(client: AsyncClient):
    headers = await _admin_headers(client)
    create_u = await client.post(
        "/users/",
        json={"name": "Alice Door", "rfid_tag": "ALICE001", "role": "user"},
        headers=headers,
    )
    assert create_u.status_code == 200
    uid = create_u.json()["id"]
    assert create_u.json()["has_pin"] is False

    set_pin = await client.put(f"/users/{uid}/pin", json={"pin": "4567"}, headers=headers)
    assert set_pin.status_code == 200

    users_resp = await client.get("/users/", headers=headers)
    alice = next(u for u in users_resp.json() if u["id"] == uid)
    assert alice["has_pin"] is True
    assert "pin_hash" not in alice

    await client.put(
        "/settings/",
        json={
            "settings": {
                "timer_duration": "11",
                "duress_mode": "false",
                "duress_rfid": "DURESS01",
                "duress_pin": "9876",
            }
        },
        headers=headers,
    )

    hw_headers = {"X-Hardware-Token": os.environ["HARDWARE_TOKEN"]}
    r1 = await client.get("/api/hardware/allowlist", headers=hw_headers)
    assert r1.status_code == 200
    data1 = r1.json()
    assert data1["timer_duration"] == 11
    assert data1["duress_mode"] is False
    assert data1["duress_rfid"] is None
    assert data1["duress_pin_hash"] is None
    assert any(t["name"] == "Alice Door" and t["rfid"] == "ALICE001" for t in data1["tags"])

    await client.put(
        "/settings/",
        json={"settings": {"duress_mode": "true"}},
        headers=headers,
    )
    r2 = await client.get("/api/hardware/allowlist", headers=hw_headers)
    data2 = r2.json()
    assert data2["duress_mode"] is True
    assert data2["duress_rfid"] == "DURESS01"
    assert data2["duress_pin_hash"]

    del_pin = await client.delete(f"/users/{uid}/pin", headers=headers)
    assert del_pin.status_code == 200
    alice_after = next(
        u for u in (await client.get("/users/", headers=headers)).json() if u["id"] == uid
    )
    assert alice_after["has_pin"] is False


@pytest.mark.asyncio
async def test_temp_pin_create_once_and_idempotency(client: AsyncClient):
    headers = await _admin_headers(client)
    idem_headers = {**headers, "Idempotency-Key": "temp-pin-req-1"}

    r1 = await client.post(
        "/api/temporary-pins",
        json={"label": "guest", "ttl_hours": 1, "max_uses": 1, "send_sms": False},
        headers=idem_headers,
    )
    assert r1.status_code == 200
    body1 = r1.json()
    assert "pin" in body1
    assert body1["uses_remaining"] == 1

    r2 = await client.post(
        "/api/temporary-pins",
        json={"label": "guest", "ttl_hours": 1, "max_uses": 1, "send_sms": False},
        headers=idem_headers,
    )
    assert r2.status_code == 200
    assert r2.json() == body1

    listed = await client.get("/api/temporary-pins", headers=headers)
    assert listed.status_code == 200
    matching = [x for x in listed.json() if x["id"] == body1["id"]]
    assert len(matching) == 1


@pytest.mark.asyncio
async def test_hardware_events_dedup_atomic_temp_pin_and_duress(client: AsyncClient, db_session):
    from app import models
    from app.services.pin_crypto import hash_pin

    headers = await _admin_headers(client)
    pin_resp = await client.post(
        "/api/temporary-pins",
        json={"label": "Courier", "ttl_hours": 2, "max_uses": 1, "send_sms": False},
        headers=headers,
    )
    plain_pin = pin_resp.json()["pin"]
    pin_id = pin_resp.json()["id"]
    pin_hash = hash_pin(plain_pin)

    await client.put(
        "/settings/",
        json={"settings": {"alert_phone": "09120000001"}},
        headers=headers,
    )

    hw_headers = {"X-Hardware-Token": os.environ["HARDWARE_TOKEN"]}
    payload = {
        "events": [
            {
                "event_id": "ev-temp-1",
                "type": "TEMP_PIN_USED",
                "pin_hash": pin_hash,
                "action": "GRANTED",
                "temperature": 24.5,
            },
            {
                "event_id": "ev-duress-1",
                "type": "GRANTED",
                "rfid": "DURESS01",
                "user_name": "Duress",
                "action": "GRANTED",
                "is_duress": True,
                "temperature": 25.0,
            },
        ]
    }

    with patch(
        "app.services.alert_sms.send_alert_sms", new=AsyncMock(return_value=True)
    ) as sms_mock:
        res1 = await client.post("/api/hardware/events", json=payload, headers=hw_headers)
        assert res1.status_code == 200
        assert res1.json()["processed"] == 2
        sms_mock.assert_awaited_once()

        # Duplicate batch with same event_ids is ignored
        res2 = await client.post("/api/hardware/events", json=payload, headers=hw_headers)
        assert res2.status_code == 200
        assert res2.json()["processed"] == 0

    pin_row = (
        (
            await db_session.execute(
                select(models.TemporaryPin).where(models.TemporaryPin.id == pin_id)
            )
        )
        .scalars()
        .first()
    )
    assert pin_row is not None
    assert pin_row.uses_remaining == 0

    # Concurrent decrements without event_id never drop uses_remaining below 0
    pin2_resp = await client.post(
        "/api/temporary-pins",
        json={"label": "Concurrent Guest", "ttl_hours": 2, "max_uses": 1, "send_sms": False},
        headers=headers,
    )
    pin2_hash = hash_pin(pin2_resp.json()["pin"])
    pin2_id = pin2_resp.json()["id"]
    conc_payload = {"events": [{"type": "TEMP_PIN_USED", "pin_hash": pin2_hash}]}
    conc_res = await asyncio.gather(
        client.post("/api/hardware/events", json=conc_payload, headers=hw_headers),
        client.post("/api/hardware/events", json=conc_payload, headers=hw_headers),
    )
    assert all(r.status_code == 200 for r in conc_res)

    pin2_row = (
        (
            await db_session.execute(
                select(models.TemporaryPin).where(models.TemporaryPin.id == pin2_id)
            )
        )
        .scalars()
        .first()
    )
    assert pin2_row is not None
    assert pin2_row.uses_remaining == 0
