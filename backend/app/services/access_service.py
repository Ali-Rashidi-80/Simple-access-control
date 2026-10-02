import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import AccessLog, User

logger = logging.getLogger("uvicorn")


class AccessService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verify_access(
        self, rfid: str, temperature: float = None, is_duress: bool = False
    ) -> tuple[bool, AccessLog, User | None]:
        """
        Verifies access for a given RFID tag.
        Returns: (is_granted, log_entry, user_obj)
        """
        result = await self.db.execute(select(User).where(User.rfid_tag == rfid))
        user = result.scalar_one_or_none()

        action = "GRANTED" if user else "DENIED"
        user_name = user.name if user else "Unknown"

        if user:
            logger.info(f"Access GRANTED for user: {user.name}")
        else:
            logger.info(f"Access DENIED for tag: {rfid}")

        log_entry = AccessLog(
            user_name=user_name,
            action=action,
            is_duress=is_duress,
            temperature=temperature,
            timestamp=datetime.utcnow(),
        )
        self.db.add(log_entry)
        await self.db.commit()
        await self.db.refresh(log_entry)

        return (user is not None), log_entry, user
