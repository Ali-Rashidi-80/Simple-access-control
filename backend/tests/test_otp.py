"""Comprehensive SMS OTP Tests: Send, Verify, Rate Limiting, Log Hygiene."""

import logging

import pytest
from httpx import AsyncClient
from sqlalchemy import select


@pytest.mark.asyncio
async def test_send_otp_valid_phone(client: AsyncClient, caplog):
    """Test sending OTP to a valid phone number without logging plaintext OTP."""
    with caplog.at_level(logging.INFO):
        response = await client.post("/auth/otp/send", json={"phone": "9120000001"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["phone_masked"] == "9120****01"
    assert "کد تأیید شما" not in caplog.text


@pytest.mark.asyncio
async def test_send_otp_invalid_phone_format(client: AsyncClient):
    response = await client.post("/auth/otp/send", json={"phone": "912345"})
    assert response.status_code == 422

    response = await client.post("/auth/otp/send", json={"phone": "0912345678"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_send_otp_empty_phone(client: AsyncClient):
    response = await client.post("/auth/otp/send", json={"phone": ""})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_verify_otp_wrong_code(client: AsyncClient):
    await client.post("/auth/otp/send", json={"phone": "9121234567"})
    response = await client.post("/auth/otp/verify", json={"phone": "9121234567", "otp": "000000"})
    assert response.status_code == 400
    assert "اشتباه" in response.json()["detail"]


@pytest.mark.asyncio
async def test_verify_otp_invalid_format(client: AsyncClient):
    response = await client.post("/auth/otp/verify", json={"phone": "9121234567", "otp": "12345"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_verify_otp_no_pending(client: AsyncClient):
    response = await client.post("/auth/otp/verify", json={"phone": "9999999999", "otp": "123456"})
    assert response.status_code == 400
    assert "یافت نشد" in response.json()["detail"]


@pytest.mark.asyncio
async def test_otp_max_attempts(client: AsyncClient):
    phone = "9127654321"
    await client.post("/auth/otp/send", json={"phone": phone})
    for _ in range(3):
        await client.post("/auth/otp/verify", json={"phone": phone, "otp": "000000"})

    response = await client.post("/auth/otp/verify", json={"phone": phone, "otp": "000000"})
    assert response.status_code == 400
    assert "حداکثر" in response.json()["detail"]


@pytest.mark.asyncio
async def test_otp_verify_consumes_atomically_and_logs_in(client: AsyncClient, db_session):
    from app import models

    login = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    op = await client.post(
        "/auth/admins",
        json={
            "username": "otp_op",
            "password": "password123",
            "full_name": "OTP Operator",
            "phone": "09120000099",
            "role": "operator",
        },
        headers=headers,
    )
    assert op.status_code == 201

    send_resp = await client.post("/auth/otp/send", json={"phone": "09120000099"})
    assert send_resp.status_code == 200

    otp_row = (
        (
            await db_session.execute(
                select(models.MobileOTP).where(models.MobileOTP.phone == "9120000099")
            )
        )
        .scalars()
        .first()
    )
    assert otp_row is not None
    code = otp_row.otp

    v1 = await client.post("/auth/otp/verify", json={"phone": "09120000099", "otp": code})
    assert v1.status_code == 200
    assert v1.json()["user"]["username"] == "otp_op"

    # Reusing the same OTP must fail
    v2 = await client.post("/auth/otp/verify", json={"phone": "09120000099", "otp": code})
    assert v2.status_code == 400


@pytest.mark.asyncio
async def test_otp_ip_rate_limiting_via_redis_store(client: AsyncClient, monkeypatch):
    from app.services import sms_otp

    monkeypatch.setattr(sms_otp, "MAX_OTP_PER_IP_HOUR", 2)
    assert (await client.post("/auth/otp/send", json={"phone": "9120000011"})).status_code == 200
    assert (await client.post("/auth/otp/send", json={"phone": "9120000012"})).status_code == 200
    limited = await client.post("/auth/otp/send", json={"phone": "9120000013"})
    assert limited.status_code == 429


@pytest.mark.asyncio
async def test_resend_otp(client: AsyncClient):
    phone = "9123456789"
    response1 = await client.post("/auth/otp/send", json={"phone": phone})
    assert response1.status_code == 200

    response2 = await client.post("/auth/otp/resend", json={"phone": phone})
    assert response2.status_code == 200
    assert "مجدداً" in response2.json()["message"]


@pytest.mark.asyncio
async def test_google_auth_redirect(client: AsyncClient):
    response = await client.get("/auth/google", follow_redirects=False)
    assert response.status_code in [302, 307, 501]


@pytest.mark.asyncio
async def test_google_callback_invalid_code(client: AsyncClient):
    response = await client.get(
        "/auth/google/callback?code=invalid&state=test", follow_redirects=False
    )
    assert response.status_code in [302, 307, 501]
