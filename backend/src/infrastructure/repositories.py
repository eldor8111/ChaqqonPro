from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from typing import TypeVar, Generic, Type, Optional, List
from src.infrastructure.database import Base
from src.infrastructure.orm_models import User, Subscription, Invoice, Payment

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: int) -> Optional[ModelType]:
        result = await db.execute(select(self.model).filter(self.model.id == id))
        return result.scalars().first()

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[ModelType]:
        result = await db.execute(select(self.model).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, obj_in: dict) -> ModelType:
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, db_obj: ModelType, obj_in: dict) -> ModelType:
        for field in obj_in:
            if hasattr(db_obj, field):
                setattr(db_obj, field, obj_in[field])
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

class SubscriptionRepository(BaseRepository[Subscription]):
    def __init__(self):
        super().__init__(Subscription)
        
    async def get_by_user_id(self, db: AsyncSession, user_id: int) -> Optional[Subscription]:
        result = await db.execute(select(Subscription).filter(Subscription.user_id == user_id))
        return result.scalars().first()

class InvoiceRepository(BaseRepository[Invoice]):
    def __init__(self):
        super().__init__(Invoice)
        
    async def get_by_unique_amount(self, db: AsyncSession, unique_amount: float) -> Optional[Invoice]:
        result = await db.execute(select(Invoice).filter(Invoice.unique_amount == unique_amount))
        return result.scalars().first()
        
    async def get_by_user_id(self, db: AsyncSession, user_id: int) -> List[Invoice]:
        result = await db.execute(select(Invoice).filter(Invoice.user_id == user_id))
        return list(result.scalars().all())

class PaymentRepository(BaseRepository[Payment]):
    def __init__(self):
        super().__init__(Payment)

user_repo = UserRepository()
subscription_repo = SubscriptionRepository()
invoice_repo = InvoiceRepository()
payment_repo = PaymentRepository()
