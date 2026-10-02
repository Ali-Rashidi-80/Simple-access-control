import sys
from pathlib import Path

# Ensure local backend directory has first priority in sys.path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
import pytest_asyncio
from app.database import Base, get_db
from app.main import app, seed_default_admin
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Use temporary file database for tests to support concurrent connections cleanly across threads
TEST_DATABASE_PATH = "./test_gate.db"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DATABASE_PATH}"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=NullPool,
)

# Test Session maker
TestingSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevent detached instance errors
)


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """
    Fixture that creates fresh database for each test,
    seeds admin user, yields session, then drops tables.
    """
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # IMPORTANT: Seed default admin user for auth tests
        await seed_default_admin(session)
        await session.commit()
        yield session

    # Drop tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """
    Fixture for HTTP client with test database (no auth).
    """

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    import app.database as app_db
    import app.main as app_main

    orig_main_session = app_main.AsyncSessionLocal
    orig_db_session = app_db.AsyncSessionLocal
    app_main.AsyncSessionLocal = TestingSessionLocal
    app_db.AsyncSessionLocal = TestingSessionLocal

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app_main.AsyncSessionLocal = orig_main_session
    app_db.AsyncSessionLocal = orig_db_session
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def auth_headers(client):
    """
    Fixture that returns auth headers with valid token.
    Use this for tests that require authentication.
    """
    response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session", autouse=True)
def cleanup_database():
    """Cleanup fixture - no-op for in-memory database"""
    yield
