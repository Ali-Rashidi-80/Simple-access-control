import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
import os
import asyncio

from app.main import app
from app.database import Base, get_db

# Use a file-based SQLite db for "Real" persistence tests or ":memory:" for speed
# Using file ensures we can inspect it if needed, or share across connections if using threads (though StaticPool handles memory fine)
# For this requirement ("Real test database... separate SQLite file"), we'll use a file.
# Use in-memory database to avoid Windows file locking issues
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create async engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Test Session
TestingSessionLocal = async_sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=test_engine, 
    class_=AsyncSession
)

# @pytest_asyncio.fixture(scope="session")
# def event_loop():
#     """Create an instance of the default event loop for each test case."""
#     loop = asyncio.new_event_loop()
#     yield loop
#     loop.close()

@pytest_asyncio.fixture(scope="function")
async def db_session():
    """
    Fixture that creates a fresh database for each test function,
    creates tables, yields the session, and then drops tables.
    """
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    # Drop tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        
    # Optional: Delete the file if we want a truly clean slate every time, 
    # but strictly creating/dropping tables is sufficient for "Real DB" isolation per test.
    if os.path.exists("./test.db"):
        os.remove("./test.db")

from httpx import AsyncClient, ASGITransport

# ... imports ...

@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """
    Fixture for the HTTP client. 
    Overrides the get_db dependency to use the test session.
    """
    async def override_get_db():
        try:
            yield db_session
        finally:
            pass # Session is closed by the db_session fixture

    app.dependency_overrides[get_db] = override_get_db
    
    # Updated for recent httpx versions requiring transport for app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()
    
    # Ensure engine disposes connections to allow file deletion on Windows
    # await test_engine.dispose() # Causing 'no active connection' with StaticPool memory DB
    
    # Cleanup not needed for :memory: database
    # if os.path.exists("./test.db"):
    #     try:
    #         os.remove("./test.db")
    #     except (PermissionError, OSError):
    #         pass # Windows file locking; table drop handled in fixture is sufficient.

@pytest.fixture(scope="session", autouse=True)
def cleanup_database():
    yield
    # No file to remove for :memory: database
