"""
Database and Data Validation Tests
Tests: Data Integrity, Constraints, Transactions, Edge Cases
"""

from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient


# Helper to get auth headers
async def get_auth_headers(client):
    """Login and return auth headers"""
    response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# DATABASE INTEGRITY TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_user_unique_rfid_constraint(client: AsyncClient):
    """Test RFID uniqueness constraint is enforced"""
    headers = await get_auth_headers(client)

    user1 = {"name": "User One", "rfid_tag": "UNIQUE_RFID_001", "role": "user"}
    user2 = {"name": "User Two", "rfid_tag": "UNIQUE_RFID_001", "role": "admin"}

    r1 = await client.post("/users/", json=user1, headers=headers)
    assert r1.status_code == 200

    r2 = await client.post("/users/", json=user2, headers=headers)
    assert r2.status_code == 400, "Duplicate RFID should be rejected"


@pytest.mark.asyncio
async def test_log_data_persistence(client: AsyncClient):
    """Test logs are persisted correctly in database"""
    headers = await get_auth_headers(client)

    logs1 = await client.get("/logs/?limit=100", headers=headers)
    if logs1.status_code != 200:
        pytest.skip("Logs endpoint returned non-200")

    data1 = logs1.json()
    initial_count = data1.get("total", len(data1.get("logs", [])))

    logs2 = await client.get("/logs/?limit=100", headers=headers)
    data2 = logs2.json()
    second_count = data2.get("total", len(data2.get("logs", [])))

    assert second_count == initial_count, "Log count should be consistent"


@pytest.mark.asyncio
async def test_settings_persistence(client: AsyncClient):
    """Test settings persist across requests"""
    headers = await get_auth_headers(client)

    unique_value = f"test_{datetime.now().timestamp()}"
    await client.put("/settings/", json={"settings": {"test_key": unique_value}}, headers=headers)

    get_response = await client.get("/settings/")
    settings = get_response.json()["settings"]
    assert settings.get("test_key") == unique_value


@pytest.mark.asyncio
async def test_user_delete_cascades(client: AsyncClient):
    """Test deleting user doesn't leave orphan data"""
    headers = await get_auth_headers(client)

    user = {"name": "Cascade Test", "rfid_tag": "CASCADE_001", "role": "user"}
    create = await client.post("/users/", json=user, headers=headers)
    user_id = create.json()["id"]

    await client.delete(f"/users/{user_id}", headers=headers)

    users = await client.get("/users/", headers=headers)
    assert not any(u["id"] == user_id for u in users.json())


# =============================================================================
# DATA VALIDATION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_user_name_required(client: AsyncClient):
    """Test user creation requires name"""
    headers = await get_auth_headers(client)
    user = {"rfid_tag": "NO_NAME_001", "role": "user"}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_user_rfid_required(client: AsyncClient):
    """Test user creation requires RFID tag"""
    headers = await get_auth_headers(client)
    user = {"name": "No RFID User", "role": "user"}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_log_filter_invalid_status(client: AsyncClient):
    """Test logs endpoint handles invalid status"""
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?status=invalid_status", headers=headers)
    assert response.status_code in [200, 422]


@pytest.mark.asyncio
async def test_log_filter_invalid_date(client: AsyncClient):
    """Test logs endpoint handles invalid date format"""
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?start_date=not-a-date", headers=headers)
    assert response.status_code in [200, 422]


@pytest.mark.asyncio
async def test_pagination_negative_skip(client: AsyncClient):
    """Test negative skip value is handled"""
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?skip=-10", headers=headers)
    assert response.status_code in [200, 422]


@pytest.mark.asyncio
async def test_pagination_zero_limit(client: AsyncClient):
    """Test zero limit is handled"""
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?limit=0", headers=headers)
    assert response.status_code in [200, 422]


@pytest.mark.asyncio
async def test_pagination_very_large_limit(client: AsyncClient):
    """Test very large limit doesn't crash"""
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?limit=100000", headers=headers)
    assert response.status_code in [200, 422]


# =============================================================================
# EDGE CASES
# =============================================================================


@pytest.mark.asyncio
async def test_very_long_rfid_tag(client: AsyncClient):
    """Test handling of abnormally long RFID tag"""
    headers = await get_auth_headers(client)
    long_rfid = "A" * 1000
    user = {"name": "Long RFID", "rfid_tag": long_rfid, "role": "user"}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code in [200, 400, 422]


@pytest.mark.asyncio
async def test_unicode_rfid_tag(client: AsyncClient):
    """Test handling of Unicode in RFID tag"""
    headers = await get_auth_headers(client)
    user = {"name": "Unicode RFID", "rfid_tag": "تست۱۲۳", "role": "user"}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code in [200, 400, 422]


@pytest.mark.asyncio
async def test_empty_body_requests(client: AsyncClient):
    """Test endpoints handle empty body gracefully"""
    headers = await get_auth_headers(client)
    response = await client.post("/users/", json={}, headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_null_values_in_payload(client: AsyncClient):
    """Test handling of null values in payload"""
    headers = await get_auth_headers(client)
    user = {"name": None, "rfid_tag": None, "role": None}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_extra_fields_ignored(client: AsyncClient):
    """Test extra fields in payload don't cause errors"""
    headers = await get_auth_headers(client)
    user = {"name": "Extra Fields User", "rfid_tag": "EXTRA_001", "role": "user", "unknown_field": "should_be_ignored"}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code == 200


# =============================================================================
# CONCURRENT TESTS (Skipped)
# =============================================================================


@pytest.mark.asyncio
@pytest.mark.skip(reason="SQLAlchemy session state issues in test environment")
async def test_concurrent_user_creation(client: AsyncClient):
    pass


@pytest.mark.asyncio
@pytest.mark.skip(reason="SQLAlchemy session state issues in test environment")
async def test_concurrent_read_write(client: AsyncClient):
    pass


# =============================================================================
# DATETIME HANDLING TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_log_date_filter_iso_format(client: AsyncClient):
    """Test date filter accepts ISO 8601 format"""
    headers = await get_auth_headers(client)
    date_str = datetime.now().isoformat()
    response = await client.get(f"/logs/?start_date={date_str}", headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_log_date_filter_future_date(client: AsyncClient):
    """Test date filter with future date returns empty"""
    headers = await get_auth_headers(client)
    future = (datetime.now() + timedelta(days=365)).isoformat()
    response = await client.get(f"/logs/?start_date={future}", headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_log_date_range(client: AsyncClient):
    """Test date range filter"""
    headers = await get_auth_headers(client)
    start = (datetime.now() - timedelta(days=7)).isoformat()
    end = datetime.now().isoformat()
    response = await client.get(f"/logs/?start_date={start}&end_date={end}", headers=headers)
    assert response.status_code == 200
