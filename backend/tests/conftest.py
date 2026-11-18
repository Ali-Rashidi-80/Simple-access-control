"""Shared pytest fixtures for SentryGate backend tests."""

import asyncio
import os

os.environ["SKIP_DOTENV"] = "1"
os.environ["REDIS_URL"] = "memory://"
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-for-pytest-32b")
os.environ.setdefault("HARDWARE_TOKEN", "test-hardware-token")
os.environ.setdefault("PIN_PEPPER", "test-pin-pepper")

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.database import engine as app_engine
from app.database import get_db
from app.main import app, seed_default_admin
from app.services import redis_store
from app.services.processor import manager

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Create fresh in-memory database for each test, seed admin, yield session, then drop."""
    redis_store.clear_memory()
    manager._last_open_at = 0.0
    manager.hardware_clients.clear()
    manager.frontend_clients.clear()
    manager.frontend_meta.clear()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session = TestingSessionLocal()
    try:
        await seed_default_admin(session)
        await session.commit()
        yield session
    finally:
        try:
            await session.close()
        except Exception:
            pass
        try:
            async with test_engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
        except Exception:
            pass


@pytest_asyncio.fixture(scope="function")
async def client(db_session, monkeypatch):
    """HTTP client wired to in-memory test DB (isolated sessions per request)."""
    import app.database as database_module
    import app.main as main_module

    async def override_get_db():
        async with TestingSessionLocal() as req_session:
            yield req_session

    monkeypatch.setattr(database_module, "AsyncSessionLocal", TestingSessionLocal)
    monkeypatch.setattr(main_module, "AsyncSessionLocal", TestingSessionLocal)
    monkeypatch.setattr(database_module, "engine", test_engine)
    monkeypatch.setattr(main_module, "engine", test_engine)

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def auth_headers(client):
    """Return Bearer auth headers for the seeded admin user."""
    response = await client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session", autouse=True)
def cleanup_database():
    """Dispose async engines after all tests so pytest exits cleanly without hanging."""
    yield
    asyncio.run(test_engine.dispose())
    asyncio.run(app_engine.dispose())
