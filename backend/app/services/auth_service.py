from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_rfid(self, rfid: str):
        result = await self.db.execute(select(models.User).where(models.User.rfid_tag == rfid))
        return result.scalars().first()
