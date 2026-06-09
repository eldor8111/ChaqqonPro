from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.database import get_db_session
from src.application.services import UserService
from src.infrastructure.orm_models import UserStatus
from pydantic import BaseModel

router = APIRouter(prefix="/access", tags=["Access"])

class AccessCheckRequest(BaseModel):
    user_id: int

class AccessCheckResponse(BaseModel):
    has_access: bool
    status: str

@router.post("/check", response_model=AccessCheckResponse)
async def check_access(req: AccessCheckRequest, db: AsyncSession = Depends(get_db_session)):
    # Verify if user is active
    user = await UserService.get_user(db, req.user_id)
    has_access = user.status == UserStatus.ACTIVE
    return AccessCheckResponse(has_access=has_access, status=user.status)
