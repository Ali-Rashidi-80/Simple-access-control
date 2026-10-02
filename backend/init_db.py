import asyncio

# Import models to register them with Base
from app.database import Base, engine


async def init_models():
    print(f"Initializing database with URL: {engine.url}")
    async with engine.begin() as conn:
        print("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_models())
