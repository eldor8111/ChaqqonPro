from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.database import get_db_session
from src.core.security import decode_access_token
from src.core.exceptions import NotAuthenticated

security = HTTPBearer()

async def get_current_user_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise NotAuthenticated("Invalid or expired token")
    return payload

def get_db() -> AsyncSession:
    # A generic dependency returned for dependency injection
    pass # Replaced by the actual get_db_session directly in routers as Depends(get_db_session)
