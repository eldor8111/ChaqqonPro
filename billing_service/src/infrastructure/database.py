from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, declared_attr
from src.core.config import settings

# Async Engine Setup
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True
)

SessionFactory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

class BaseCustom:
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower() + "s"
    
    # Can add common columns here like created_at if needed, but we will put it in the base classes directly.

Base = declarative_base(cls=BaseCustom)

async def get_db_session() -> AsyncSession:
    async with SessionFactory() as session:
        yield session
