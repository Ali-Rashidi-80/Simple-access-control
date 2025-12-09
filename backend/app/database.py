from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Use an environment variable for flexibility, default to a local file for now but ready for Postgres
# For Phase 1 (Microscopic Audit), we will stick to SQLite to ensure we don't break the user's setup immediately, 
# BUT we switch to the ASYNC driver.
# ideally: POSTGRES_URL = "postgresql+asyncpg://user:password@localhost/dbname"
DATABASE_URL = "sqlite+aiosqlite:///./sql_app.db"

engine = create_async_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
