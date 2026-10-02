from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from .. import models


class LogService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_access_log(
        self, user_name: str, rfid: str, action: str, is_duress: bool, temperature: float | None
    ):
        log_entry = models.AccessLog(
            user_name=user_name,
            rfid_tag=rfid,
            action=action,
            is_duress=is_duress,
            temperature=temperature,
            timestamp=datetime.now(timezone.utc),
        )
        self.db.add(log_entry)
        await self.db.commit()
        await self.db.refresh(log_entry)
        return log_entry
