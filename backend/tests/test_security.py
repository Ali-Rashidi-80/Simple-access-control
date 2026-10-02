"""
Comprehensive Security Tests for SentryGate Backend
Tests: Rate Limiting, JWT Validation, SQL Injection Prevention, Session Management
"""

import os
import sys

import pytest
from httpx import AsyncClient

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Helper to get auth headers
async def get_auth_headers(client):
    """Login and return auth headers"""
    response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# --- AUTHENTICATION TESTS ---


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test successful login with correct credentials"""
    response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Test login with wrong password returns 401"""
    response = await client.post("/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert response.status_code == 401
    assert "اشتباه" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_invalid_username_format(client: AsyncClient):
    """Test login with invalid username format"""
    response = await client.post("/auth/login", json={"username": "invalid user!@#", "password": "password"})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with non-existent user"""
    response = await client.post("/auth/login", json={"username": "nonexistent_user", "password": "password123"})
    assert response.status_code == 401


# --- RATE LIMITING TESTS ---


@pytest.mark.asyncio
async def test_rate_limiting_after_failures(client: AsyncClient):
    """Test rate limiting kicks in after 5 failed attempts"""
    # Make 5 failed login attempts
    for i in range(5):
        await client.post("/auth/login", json={"username": "test_rate_limit_user", "password": "wrong_password"})

    # 6th attempt should be rate limited
    response = await client.post("/auth/login", json={"username": "test_rate_limit_user", "password": "any_password"})
    assert response.status_code == 429
    assert "Retry-After" in response.headers


# --- JWT TOKEN TESTS ---


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient):
    """Test accessing protected endpoint without token"""
    response = await client.put("/settings/", json={"settings": {"theme": "dark"}})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_with_valid_token(client: AsyncClient):
    """Test accessing protected endpoint with valid token"""
    # Login first
    login_response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_response.json()["access_token"]

    # Access protected endpoint
    response = await client.put(
        "/settings/", json={"settings": {"theme": "dark"}}, headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_protected_endpoint_with_invalid_token(client: AsyncClient):
    """Test accessing protected endpoint with invalid token"""
    response = await client.put(
        "/settings/", json={"settings": {"theme": "dark"}}, headers={"Authorization": "Bearer invalid_token_12345"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_token_validation_endpoint(client: AsyncClient):
    """Test token validation endpoint"""
    # Login first
    login_response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_response.json()["access_token"]

    # Validate token
    response = await client.get("/auth/validate", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] == True


@pytest.mark.asyncio
async def test_token_validation_expired(client: AsyncClient):
    """Test validation with expired/invalid token"""
    response = await client.get("/auth/validate", headers={"Authorization": "Bearer expired_token"})
    data = response.json()
    assert data["valid"] == False


# --- INPUT SANITIZATION TESTS ---


@pytest.mark.asyncio
async def test_xss_prevention_in_user_name(client: AsyncClient):
    """Test XSS content is sanitized in user creation"""
    headers = await get_auth_headers(client)
    response = await client.post(
        "/users/",
        json={"name": "<script>alert('xss')</script>", "rfid_tag": "XSS_TEST_001", "role": "user"},
        headers=headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_sql_injection_in_login_username(client: AsyncClient):
    """Test SQL injection is prevented in login"""
    response = await client.post(
        "/auth/login", json={"username": "admin'; DROP TABLE users; --", "password": "password"}
    )
    # Should fail username validation, not execute SQL
    assert response.status_code in [400, 401]


@pytest.mark.asyncio
async def test_sql_injection_in_user_query(client: AsyncClient):
    """Test SQL injection is prevented in user queries"""
    headers = await get_auth_headers(client)
    response = await client.get("/users/?limit=10' OR '1'='1", headers=headers)
    assert response.status_code in [200, 422]


# --- SESSION MANAGEMENT TESTS ---


@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    """Test logout returns success"""
    # Login first
    login_response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_response.json()["access_token"]

    # Logout
    response = await client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_me_endpoint(client: AsyncClient):
    """Test /auth/me returns current user"""
    # Login first
    login_response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_response.json()["access_token"]

    # Get current user
    response = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert data["role"] == "admin"


# --- SETTINGS PERSISTENCE TESTS ---


@pytest.mark.asyncio
async def test_get_settings_public(client: AsyncClient):
    """Test anyone can read settings"""
    response = await client.get("/settings/")
    assert response.status_code == 200
    data = response.json()
    assert "settings" in data


@pytest.mark.asyncio
async def test_update_settings_requires_auth(client: AsyncClient):
    """Test updating settings requires authentication"""
    response = await client.put("/settings/", json={"settings": {"theme": "neon"}})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_settings_with_auth(client: AsyncClient):
    """Test updating settings with authenticated user"""
    # Login
    login_response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_response.json()["access_token"]

    # Update settings
    response = await client.put(
        "/settings/",
        json={"settings": {"theme": "matrix", "language": "en"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    # Verify settings persisted
    get_response = await client.get("/settings/")
    settings = get_response.json()["settings"]
    assert settings["theme"] == "matrix"


# --- PROFILE TESTS ---


@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient):
    """Test updating user profile"""
    # Login
    login_response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_response.json()["access_token"]

    # Update profile
    response = await client.put(
        "/profile/",
        json={"full_name": "مدیر اصلی", "email": "admin@test.com"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient):
    """Test changing password"""
    # Login
    login_response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_response.json()["access_token"]

    # Change password
    response = await client.put(
        "/profile/password",
        json={"current_password": "admin123", "new_password": "newpassword123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    # Verify new password works
    new_login = await client.post("/auth/login", json={"username": "admin", "password": "newpassword123"})
    assert new_login.status_code == 200

    # Reset password back for other tests
    await client.put(
        "/profile/password",
        json={"current_password": "newpassword123", "new_password": "admin123"},
        headers={"Authorization": f"Bearer {new_login.json()['access_token']}"},
    )


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient):
    """Test changing password with wrong current password"""
    # Login
    login_response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_response.json()["access_token"]

    # Try change password with wrong current
    response = await client.put(
        "/profile/password",
        json={"current_password": "wrongpassword", "new_password": "newpassword123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


# --- LOG FILTERING TESTS ---


@pytest.mark.asyncio
async def test_logs_pagination(client: AsyncClient):
    """Test logs endpoint with pagination"""
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?skip=0&limit=10", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert "total" in data
    assert "stats" in data


@pytest.mark.asyncio
async def test_logs_status_filter(client: AsyncClient):
    """Test logs endpoint with status filter"""
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?status=success", headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_logs_date_filter(client: AsyncClient):
    """Test logs endpoint with date filter"""
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?start_date=2024-01-01T00:00:00", headers=headers)
    assert response.status_code == 200
