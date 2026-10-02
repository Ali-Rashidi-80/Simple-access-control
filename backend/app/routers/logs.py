from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import AccessLog
from ..schemas import AccessLogResponse

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/", response_model=List[AccessLogResponse])
async def read_logs(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AccessLog).order_by(desc(AccessLog.timestamp)).offset(skip).limit(limit))
    logs = result.scalars().all()
    return logs
