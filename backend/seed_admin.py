import asyncio

from app.database import engine
from app.models import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker


async def seed():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        result = await db.execute(select(User).where(User.name == "admin"))
        if not result.scalars().first():
            print("Creating admin user...")
            admin = User(name="admin", role="admin", rfid_tag="ADMIN_TAG_001")
            db.add(admin)
            await db.commit()
            print("Admin user created.")
        else:
            print("Admin user already exists.")


if __name__ == "__main__":
    asyncio.run(seed())
