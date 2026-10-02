"""
Comprehensive SMS OTP Tests
Tests: Send OTP, Verify OTP, Rate Limiting, Identity Linking
"""

import pytest
from httpx import AsyncClient


# Helper to get auth headers
async def get_auth_headers(client: AsyncClient):
    """Login and return auth headers"""
    response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# OTP SEND TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_send_otp_valid_phone(client: AsyncClient):
    """Test sending OTP to a valid phone number"""
    response = await client.post("/auth/otp/send", json={"phone": "9204963846"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "phone_masked" in data
    assert data["phone_masked"] == "9204****46"


@pytest.mark.asyncio
async def test_send_otp_invalid_phone_format(client: AsyncClient):
    """Test sending OTP to invalid phone format"""
    # Too short
    response = await client.post("/auth/otp/send", json={"phone": "912345"})
    assert response.status_code == 422  # Validation error

    # Doesn't start with 9
    response = await client.post(
        "/auth/otp/send",
        json={"phone": "0912345678"},  # 10 digits but starts with 0
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_send_otp_empty_phone(client: AsyncClient):
    """Test sending OTP with empty phone"""
    response = await client.post("/auth/otp/send", json={"phone": ""})
    assert response.status_code == 422


# =============================================================================
# OTP VERIFY TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_verify_otp_wrong_code(client: AsyncClient):
    """Test verifying with wrong OTP code"""
    # First send OTP
    await client.post("/auth/otp/send", json={"phone": "9121234567"})

    # Try wrong code
    response = await client.post("/auth/otp/verify", json={"phone": "9121234567", "otp": "000000"})
    assert response.status_code == 400
    assert "اشتباه" in response.json()["detail"]


@pytest.mark.asyncio
async def test_verify_otp_invalid_format(client: AsyncClient):
    """Test verifying with invalid OTP format"""
    response = await client.post(
        "/auth/otp/verify",
        json={
            "phone": "9121234567",
            "otp": "12345",  # Only 5 digits
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_verify_otp_no_pending(client: AsyncClient):
    """Test verifying when no OTP was sent"""
    response = await client.post("/auth/otp/verify", json={"phone": "9999999999", "otp": "123456"})
    assert response.status_code == 400
    assert "یافت نشد" in response.json()["detail"]


# =============================================================================
# RATE LIMITING TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_otp_max_attempts(client: AsyncClient):
    """Test OTP verification blocks after 3 wrong attempts"""
    phone = "9127654321"

    # Send OTP
    await client.post("/auth/otp/send", json={"phone": phone})

    # Try 3 wrong codes
    for _ in range(3):
        await client.post("/auth/otp/verify", json={"phone": phone, "otp": "000000"})

    # 4th attempt should fail with max attempts error
    response = await client.post("/auth/otp/verify", json={"phone": phone, "otp": "000000"})
    assert response.status_code == 400
    assert "حداکثر" in response.json()["detail"]


# =============================================================================
# RESEND TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_resend_otp(client: AsyncClient):
    """Test resending OTP"""
    phone = "9123456789"

    # Send OTP
    response1 = await client.post("/auth/otp/send", json={"phone": phone})
    assert response1.status_code == 200

    # Resend OTP
    response2 = await client.post("/auth/otp/resend", json={"phone": phone})
    assert response2.status_code == 200
    assert "مجدداً" in response2.json()["message"]


# =============================================================================
# GOOGLE OAUTH TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_google_auth_redirect(client: AsyncClient):
    """Test Google OAuth redirect endpoint"""
    response = await client.get("/auth/google", follow_redirects=False)
    # Should redirect to Google or return 501 if not configured
    assert response.status_code in [302, 307, 501]


@pytest.mark.asyncio
async def test_google_callback_invalid_code(client: AsyncClient):
    """Test Google callback with invalid code"""
    response = await client.get("/auth/google/callback?code=invalid&state=test", follow_redirects=False)
    # Should redirect to login with error
    assert response.status_code in [302, 307, 501]
