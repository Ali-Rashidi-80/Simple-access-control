"""Access log persistence service."""

from __future__ import annotations

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from .. import models


class LogService:
    """Create and persist AccessLog rows."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_access_log(
        self,
        user_name: str,
        rfid: str,
        action: str,
        is_duress: bool,
        temperature: Optional[float],
    ) -> models.AccessLog:
        log_entry = models.AccessLog(
            user_name=user_name,
            rfid_tag=rfid,
            action=action,
            is_duress=is_duress,
            temperature=temperature,
            timestamp=models.utc_now(),
        )
        self.db.add(log_entry)
        await self.db.commit()
        await self.db.refresh(log_entry)
        return log_entry
