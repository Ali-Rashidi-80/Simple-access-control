from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Use an environment variable for flexibility, default to a local file for now but ready for Postgres
# For Phase 1 (Microscopic Audit), we will stick to SQLite to ensure we don't break the user's setup immediately, 
# BUT we switch to the ASYNC driver.
# ideally: POSTGRES_URL = "postgresql+asyncpg://user:password@localhost/dbname"
# Prioritize Env Var (Production), fallback to SQLite (Dev)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./sql_app.db")

# Postgres requires no special connect_args, SQLite does
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_async_engine(
    DATABASE_URL, 
    connect_args=connect_args
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
