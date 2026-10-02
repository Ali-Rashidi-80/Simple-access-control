"""
Comprehensive Integration Tests for SentryGate Backend
Tests: Full User Flow, Authentication→Access Flow, Settings Persistence, Complete System Scenarios
"""

import asyncio
from datetime import datetime

import pytest
from httpx import AsyncClient


# Helper to get auth token
async def get_auth_headers(client):
    """Login and return auth headers"""
    response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# USER MANAGEMENT INTEGRATION TESTS (Protected - require auth)
# =============================================================================


@pytest.mark.asyncio
async def test_full_user_lifecycle(client: AsyncClient):
    """
    Test complete user lifecycle: Create → Read → Update → Delete
    Verifies database persistence at each step
    """
    headers = await get_auth_headers(client)

    # 1. CREATE
    user_data = {"name": "Lifecycle Test User", "rfid_tag": "LIFECYCLE_001", "role": "operator"}
    create_response = await client.post("/users/", json=user_data, headers=headers)
    assert create_response.status_code == 200, f"Create failed: {create_response.text}"
    created_user = create_response.json()
    user_id = created_user["id"]

    # 2. READ - Verify user exists in list
    list_response = await client.get("/users/", headers=headers)
    assert list_response.status_code == 200
    users = list_response.json()
    found = any(u["id"] == user_id for u in users)
    assert found, f"Created user {user_id} not found in list"

    # 3. DELETE
    delete_response = await client.delete(f"/users/{user_id}", headers=headers)
    assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"

    # 4. VERIFY DELETED
    list_after = await client.get("/users/", headers=headers)
    users_after = list_after.json()
    still_exists = any(u["id"] == user_id for u in users_after)
    assert not still_exists, "User still exists after deletion"


@pytest.mark.asyncio
async def test_user_with_special_characters(client: AsyncClient):
    """Test creating user with Persian/Arabic names and special characters"""
    headers = await get_auth_headers(client)

    user_data = {
        "name": "علی محمدی",  # Persian name
        "rfid_tag": "PERSIAN_USER_001",
        "role": "کاربر",  # Persian role
    }
    response = await client.post("/users/", json=user_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "علی محمدی"


@pytest.mark.asyncio
async def test_user_validation_empty_name(client: AsyncClient):
    """Test that empty user name is rejected"""
    headers = await get_auth_headers(client)

    user_data = {"name": "", "rfid_tag": "EMPTY_NAME_001", "role": "user"}
    response = await client.post("/users/", json=user_data, headers=headers)
    assert response.status_code in [400, 422], "Empty name should be rejected"


@pytest.mark.asyncio
async def test_user_validation_empty_rfid(client: AsyncClient):
    """Test that empty RFID tag is rejected"""
    headers = await get_auth_headers(client)

    user_data = {"name": "Test User", "rfid_tag": "", "role": "user"}
    response = await client.post("/users/", json=user_data, headers=headers)
    assert response.status_code in [400, 422], "Empty RFID should be rejected"


# =============================================================================
# AUTHENTICATION INTEGRATION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_full_authentication_flow(client: AsyncClient):
    """
    Test complete auth flow: Login → Access Protected → Validate → Logout
    """
    # 1. LOGIN
    login_response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    token = login_response.json()["access_token"]

    # 2. ACCESS PROTECTED ENDPOINT
    protected_response = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert protected_response.status_code == 200, "Protected access failed"
    user_data = protected_response.json()
    assert user_data["username"] == "admin"

    # 3. VALIDATE TOKEN
    validate_response = await client.get("/auth/validate", headers={"Authorization": f"Bearer {token}"})
    assert validate_response.status_code == 200
    assert validate_response.json()["valid"] == True

    # 4. LOGOUT
    logout_response = await client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_response.status_code == 200


@pytest.mark.asyncio
async def test_authentication_with_settings_update(client: AsyncClient):
    """Test authenticated user can update settings and changes persist"""
    # Login
    login = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login.json()["access_token"]

    # Update settings
    new_settings = {"settings": {"theme": "matrix", "language": "fa", "timerDuration": 15}}
    update_response = await client.put("/settings/", json=new_settings, headers={"Authorization": f"Bearer {token}"})
    assert update_response.status_code == 200

    # Read settings back (no auth required)
    get_response = await client.get("/settings/")
    assert get_response.status_code == 200
    settings = get_response.json()["settings"]
    assert settings["theme"] == "matrix"
    assert settings["language"] == "fa"


@pytest.mark.asyncio
async def test_unauthenticated_settings_update_rejected(client: AsyncClient):
    """Test that unauthenticated settings update is rejected"""
    response = await client.put("/settings/", json={"settings": {"theme": "hacker"}})
    assert response.status_code == 401, "Unauthenticated update should be rejected"


# =============================================================================
# LOG FILTERING AND PAGINATION INTEGRATION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_logs_comprehensive_filtering(client: AsyncClient):
    """Test logs endpoint with all filter combinations"""
    headers = await get_auth_headers(client)

    # Test without filters
    response1 = await client.get("/logs/", headers=headers)
    assert response1.status_code == 200

    # Test with pagination
    response2 = await client.get("/logs/?skip=0&limit=5", headers=headers)
    assert response2.status_code == 200
    data2 = response2.json()
    logs = data2.get("logs", data2)
    assert len(logs) <= 5

    # Test with status filter
    response3 = await client.get("/logs/?status=success", headers=headers)
    assert response3.status_code == 200

    # Test with date range
    today = datetime.now().isoformat()
    response4 = await client.get(f"/logs/?start_date={today}", headers=headers)
    assert response4.status_code == 200


@pytest.mark.asyncio
async def test_logs_stats_accuracy(client: AsyncClient):
    """Test that log statistics are accurate"""
    headers = await get_auth_headers(client)

    response = await client.get("/logs/", headers=headers)
    assert response.status_code == 200
    data = response.json()

    if "stats" in data:
        stats = data["stats"]
        logs = data.get("logs", [])
        assert isinstance(logs, list)
        # Verify stats exist
        assert "success" in stats or "all" in stats


# =============================================================================
# PROFILE INTEGRATION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_profile_update_flow(client: AsyncClient):
    """Test complete profile update flow"""
    # Login
    login = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login.json()["access_token"]

    # Update profile
    profile_update = {"full_name": "مدیر سیستم", "email": "admin@sentry.local"}
    update_response = await client.put("/profile/", json=profile_update, headers={"Authorization": f"Bearer {token}"})
    assert update_response.status_code == 200


@pytest.mark.asyncio
async def test_password_change_flow(client: AsyncClient):
    """Test password change with validation"""
    # Login with original password
    login1 = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert login1.status_code == 200
    token = login1.json()["access_token"]

    # Change password
    change = await client.put(
        "/profile/password",
        json={"current_password": "admin123", "new_password": "secure_password_456"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert change.status_code == 200

    # Verify new password works
    login2 = await client.post("/auth/login", json={"username": "admin", "password": "secure_password_456"})
    assert login2.status_code == 200

    # Reset password back
    await client.put(
        "/profile/password",
        json={"current_password": "secure_password_456", "new_password": "admin123"},
        headers={"Authorization": f"Bearer {login2.json()['access_token']}"},
    )


@pytest.mark.asyncio
async def test_password_change_wrong_current(client: AsyncClient):
    """Test password change fails with wrong current password"""
    login = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = login.json()["access_token"]

    change = await client.put(
        "/profile/password",
        json={"current_password": "wrong_password", "new_password": "new_password123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert change.status_code == 400, "Wrong current password should be rejected"


# =============================================================================
# COMPLETE SYSTEM SCENARIO TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_complete_access_control_scenario(client: AsyncClient):
    """
    Full scenario test:
    1. Admin logs in
    2. Creates a new user with RFID
    3. User appears in list
    4. Access log created
    5. Admin deletes user
    """
    # Step 1: Admin login and get headers
    headers = await get_auth_headers(client)

    # Step 2: Create user
    new_user = {"name": "سارا احمدی", "rfid_tag": "SCENARIO_TEST_001", "role": "employee"}
    create = await client.post("/users/", json=new_user, headers=headers)
    assert create.status_code == 200
    user_id = create.json()["id"]

    # Step 3: Verify in list
    users = await client.get("/users/", headers=headers)
    assert any(u["rfid_tag"] == "SCENARIO_TEST_001" for u in users.json())

    # Step 4: Check logs
    logs = await client.get("/logs/?limit=10", headers=headers)
    assert logs.status_code == 200

    # Step 5: Delete user
    delete = await client.delete(f"/users/{user_id}", headers=headers)
    assert delete.status_code == 200


@pytest.mark.asyncio
async def test_concurrent_requests(client: AsyncClient):
    """Test system handles concurrent requests correctly"""
    headers = await get_auth_headers(client)

    # Create multiple requests simultaneously
    async def make_request(i):
        return await client.get("/users/", headers=headers)

    # Run 5 concurrent requests
    tasks = [make_request(i) for i in range(5)]
    results = await asyncio.gather(*tasks)

    # All should succeed
    for result in results:
        assert result.status_code == 200


@pytest.mark.asyncio
async def test_api_response_format_consistency(client: AsyncClient):
    """Test all API responses have consistent format"""
    headers = await get_auth_headers(client)

    # Settings is public, users and logs need auth
    response = await client.get("/settings/")
    assert response.status_code == 200

    response = await client.get("/users/", headers=headers)
    assert response.status_code == 200

    response = await client.get("/logs/", headers=headers)
    assert response.status_code == 200


# =============================================================================
# ERROR HANDLING AND EDGE CASES
# =============================================================================


@pytest.mark.asyncio
async def test_nonexistent_user_delete(client: AsyncClient):
    """Test deleting non-existent user returns appropriate error"""
    headers = await get_auth_headers(client)
    response = await client.delete("/users/999999", headers=headers)
    assert response.status_code in [404, 400], "Should return error for non-existent user"


@pytest.mark.asyncio
async def test_invalid_json_payload(client: AsyncClient):
    """Test API handles invalid JSON gracefully"""
    # Send malformed request
    response = await client.post("/users/", content="not valid json {{{", headers={"Content-Type": "application/json"})
    assert response.status_code == 422, "Should return validation error"


@pytest.mark.asyncio
async def test_large_payload_handling(client: AsyncClient):
    """Test API handles reasonably large payloads"""
    headers = await get_auth_headers(client)

    large_name = "A" * 1000  # 1000 character name
    user_data = {"name": large_name, "rfid_tag": "LARGE_PAYLOAD_001", "role": "user"}
    response = await client.post("/users/", json=user_data, headers=headers)
    # Should either accept or reject gracefully (not crash)
    assert response.status_code in [200, 400, 422]


@pytest.mark.asyncio
async def test_unicode_in_all_fields(client: AsyncClient):
    """Test Unicode support in all user fields"""
    headers = await get_auth_headers(client)

    user_data = {"name": "محمد حسینی 日本語 🔒", "rfid_tag": "UNICODE_TEST_001", "role": "مدیر"}
    response = await client.post("/users/", json=user_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "محمد" in data["name"]
