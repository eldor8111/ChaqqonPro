from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.database import get_db_session
from src.domain.schemas import SubscriptionCreate, SubscriptionResponse
from src.application.services import SubscriptionService

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.post("/", response_model=SubscriptionResponse)
async def create_subscription(sub: SubscriptionCreate, db: AsyncSession = Depends(get_db_session)):
    return await SubscriptionService.create_subscription(db, sub)
