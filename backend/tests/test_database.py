"""Database, Data Validation, and Concurrency Tests."""

import asyncio
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient


async def get_auth_headers(client: AsyncClient) -> dict[str, str]:
    """Login and return auth headers."""
    response = await client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# DATABASE INTEGRITY TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_user_unique_rfid_constraint(client: AsyncClient):
    """Test RFID uniqueness constraint is enforced."""
    headers = await get_auth_headers(client)

    user1 = {"name": "User One", "rfid_tag": "UNIQUE_RFID_001", "role": "user"}
    user2 = {"name": "User Two", "rfid_tag": "UNIQUE_RFID_001", "role": "admin"}

    r1 = await client.post("/users/", json=user1, headers=headers)
    assert r1.status_code == 200

    r2 = await client.post("/users/", json=user2, headers=headers)
    assert r2.status_code == 400, "Duplicate RFID should be rejected"


@pytest.mark.asyncio
async def test_log_data_persistence(client: AsyncClient):
    """Test logs are persisted correctly in database."""
    headers = await get_auth_headers(client)

    logs1 = await client.get("/logs/?limit=100", headers=headers)
    assert logs1.status_code == 200
    data1 = logs1.json()
    initial_count = data1.get("total", len(data1.get("logs", [])))

    logs2 = await client.get("/logs/?limit=100", headers=headers)
    data2 = logs2.json()
    second_count = data2.get("total", len(data2.get("logs", [])))

    assert second_count == initial_count, "Log count should be consistent"


@pytest.mark.asyncio
async def test_settings_persistence(client: AsyncClient):
    """Test settings persist across requests."""
    headers = await get_auth_headers(client)

    unique_value = f"test_{datetime.now().timestamp()}"
    put_resp = await client.put(
        "/settings/",
        json={"settings": {"test_key": unique_value}},
        headers=headers,
    )
    assert put_resp.status_code == 200

    get_response = await client.get("/settings/", headers=headers)
    settings = get_response.json()["settings"]
    assert settings.get("test_key") == unique_value


@pytest.mark.asyncio
async def test_user_delete_cascades(client: AsyncClient):
    """Test deleting user doesn't leave orphan data."""
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
    headers = await get_auth_headers(client)
    user = {"rfid_tag": "NO_NAME_001", "role": "user"}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_user_rfid_required(client: AsyncClient):
    headers = await get_auth_headers(client)
    user = {"name": "No RFID User", "role": "user"}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_log_filter_invalid_status(client: AsyncClient):
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?status=invalid_status", headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_log_filter_invalid_date(client: AsyncClient):
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?start_date=not-a-date", headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_pagination_negative_skip(client: AsyncClient):
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?skip=-10", headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_pagination_zero_limit(client: AsyncClient):
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?limit=0", headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_pagination_very_large_limit(client: AsyncClient):
    headers = await get_auth_headers(client)
    response = await client.get("/logs/?limit=100000", headers=headers)
    assert response.status_code == 422


# =============================================================================
# EDGE CASES
# =============================================================================


@pytest.mark.asyncio
async def test_very_long_rfid_tag(client: AsyncClient):
    headers = await get_auth_headers(client)
    long_rfid = "A" * 1000
    user = {"name": "Long RFID", "rfid_tag": long_rfid, "role": "user"}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code in [200, 400, 422]


@pytest.mark.asyncio
async def test_unicode_rfid_tag(client: AsyncClient):
    headers = await get_auth_headers(client)
    user = {"name": "Unicode RFID", "rfid_tag": "تست۱۲۳", "role": "user"}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code in [200, 400, 422]


@pytest.mark.asyncio
async def test_empty_body_requests(client: AsyncClient):
    headers = await get_auth_headers(client)
    response = await client.post("/users/", json={}, headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_null_values_in_payload(client: AsyncClient):
    headers = await get_auth_headers(client)
    user = {"name": None, "rfid_tag": None, "role": None}
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_extra_fields_ignored(client: AsyncClient):
    headers = await get_auth_headers(client)
    user = {
        "name": "Extra Fields User",
        "rfid_tag": "EXTRA_001",
        "role": "user",
        "unknown_field": "should_be_ignored",
    }
    response = await client.post("/users/", json=user, headers=headers)
    assert response.status_code == 200


# =============================================================================
# CONCURRENT TESTS
# =============================================================================


async def _make_concurrent_client(tmp_path, monkeypatch):
    """Build an AsyncClient backed by a WAL file SQLite DB with per-request connections."""
    from contextlib import asynccontextmanager

    from httpx import ASGITransport
    from sqlalchemy import event
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    import app.database as database_module
    import app.main as main_module
    from app.database import Base, get_db
    from app.main import app, seed_default_admin

    db_file = tmp_path / "concurrent.db"
    conc_engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_file.as_posix()}",
        connect_args={"check_same_thread": False, "timeout": 30},
        poolclass=NullPool,
    )

    @event.listens_for(conc_engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _conn_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=10000")
        cursor.close()

    @event.listens_for(conc_engine.sync_engine, "begin")
    def _do_begin(conn):
        conn.exec_driver_sql("BEGIN IMMEDIATE")

    ConcSession = async_sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=conc_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with conc_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with ConcSession() as seed_db:
        await seed_default_admin(seed_db)

    async def override_get_db():
        async with ConcSession() as session:
            yield session

    monkeypatch.setattr(database_module, "AsyncSessionLocal", ConcSession)
    monkeypatch.setattr(main_module, "AsyncSessionLocal", ConcSession)
    app.dependency_overrides[get_db] = override_get_db

    @asynccontextmanager
    async def _ctx():
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                yield ac
        finally:
            app.dependency_overrides.clear()
            await conc_engine.dispose()

    return _ctx()


@pytest.mark.asyncio
async def test_concurrent_user_creation(tmp_path, monkeypatch):
    """Concurrent creation of distinct users and duplicate-RFID conflict handling."""
    async with await _make_concurrent_client(tmp_path, monkeypatch) as conc_client:
        headers = await get_auth_headers(conc_client)

        distinct_tasks = [
            conc_client.post(
                "/users/",
                json={"name": f"Concurrent {i}", "rfid_tag": f"CONC_TAG_{i}", "role": "user"},
                headers=headers,
            )
            for i in range(5)
        ]
        distinct_results = await asyncio.gather(*distinct_tasks)
        assert all(r.status_code == 200 for r in distinct_results)

        dup_tasks = [
            conc_client.post(
                "/users/",
                json={"name": f"Race {i}", "rfid_tag": "RACE_TAG_001", "role": "user"},
                headers=headers,
            )
            for i in range(3)
        ]
        dup_results = await asyncio.gather(*dup_tasks)
        statuses = [r.status_code for r in dup_results]
        assert statuses.count(200) == 1
        assert statuses.count(400) == 2


@pytest.mark.asyncio
async def test_concurrent_read_write(tmp_path, monkeypatch):
    """Concurrent writes and reads complete without session contention or data loss."""
    async with await _make_concurrent_client(tmp_path, monkeypatch) as conc_client:
        headers = await get_auth_headers(conc_client)

        async def write_user(idx: int):
            return await conc_client.post(
                "/users/",
                json={"name": f"RW User {idx}", "rfid_tag": f"RW_TAG_{idx}", "role": "user"},
                headers=headers,
            )

        async def read_users():
            return await conc_client.get("/users/", headers=headers)

        async def read_logs():
            return await conc_client.get("/logs/", headers=headers)

        results = await asyncio.gather(
            write_user(1),
            read_users(),
            write_user(2),
            read_logs(),
            write_user(3),
            read_users(),
        )
        assert all(r.status_code == 200 for r in results)

        final_users = await conc_client.get("/users/", headers=headers)
        tags = {u["rfid_tag"] for u in final_users.json()}
        assert {"RW_TAG_1", "RW_TAG_2", "RW_TAG_3"}.issubset(tags)


# =============================================================================
# DATETIME HANDLING TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_log_date_filter_iso_format(client: AsyncClient):
    headers = await get_auth_headers(client)
    date_str = datetime.now().isoformat()
    response = await client.get(f"/logs/?start_date={date_str}", headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_log_date_filter_future_date(client: AsyncClient):
    headers = await get_auth_headers(client)
    future = (datetime.now() + timedelta(days=365)).isoformat()
    response = await client.get(f"/logs/?start_date={future}", headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_log_date_range(client: AsyncClient):
    headers = await get_auth_headers(client)
    start = (datetime.now() - timedelta(days=7)).isoformat()
    end = datetime.now().isoformat()
    response = await client.get(f"/logs/?start_date={start}&end_date={end}", headers=headers)
    assert response.status_code == 200
