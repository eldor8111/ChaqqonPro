from sqlalchemy.ext.asyncio import AsyncSession
import random
from datetime import datetime
from dateutil.relativedelta import relativedelta
from src.infrastructure.repositories import user_repo, subscription_repo, invoice_repo, payment_repo
from src.infrastructure.orm_models import UserStatus, SubscriptionStatus, InvoiceStatus, PaymentStatus
from src.domain import schemas
from src.core.exceptions import EntityNotFound, InvalidOperation

class UserService:
    @staticmethod
    async def create_user(db: AsyncSession, user: schemas.UserCreate):
        return await user_repo.create(db, user.model_dump())

    @staticmethod
    async def get_user(db: AsyncSession, user_id: int):
        user = await user_repo.get(db, user_id)
        if not user:
            raise EntityNotFound("User not found")
        return user

    @staticmethod
    async def update_status(db: AsyncSession, user_id: int, status: UserStatus):
        user = await UserService.get_user(db, user_id)
        return await user_repo.update(db, user, {"status": status})

class SubscriptionService:
    @staticmethod
    async def create_subscription(db: AsyncSession, sub: schemas.SubscriptionCreate):
        await UserService.get_user(db, sub.user_id)
        return await subscription_repo.create(db, sub.model_dump())

    @staticmethod
    async def activate_subscription(db: AsyncSession, user_id: int, duration_months: int = 1):
        sub = await subscription_repo.get_by_user_id(db, user_id)
        if not sub:
            raise EntityNotFound("Subscription not found")
        
        now = datetime.utcnow()
        if sub.next_payment_date and sub.next_payment_date > now:
            sub.next_payment_date = sub.next_payment_date + relativedelta(months=duration_months)
        else:
            sub.next_payment_date = now + relativedelta(months=duration_months)
            
        sub.status = SubscriptionStatus.ACTIVE
        await db.commit()
        await db.refresh(sub)
        
        # Unblock user
        await UserService.update_status(db, user_id, UserStatus.ACTIVE)
        return sub

    @staticmethod
    async def check_expirations(db: AsyncSession):
        subs = await subscription_repo.get_all(db, limit=1000)
        now = datetime.utcnow()
        count = 0
        for sub in subs:
            if sub.status == SubscriptionStatus.ACTIVE and sub.next_payment_date < now:
                sub.status = SubscriptionStatus.EXPIRED
                await db.commit()
                # Block user
                await UserService.update_status(db, sub.user_id, UserStatus.BLOCKED)
                count += 1
        return {"expired_count": count}

class InvoiceService:
    @staticmethod
    async def generate_invoice(db: AsyncSession, user_id: int, base_amount: float, due_date: datetime):
        await UserService.get_user(db, user_id)
        
        # Attempt to find a unique random amount 
        max_attempts = 100
        for _ in range(max_attempts):
            suffix = random.randint(100, 999)
            unique_amount = base_amount + suffix
            
            existing = await invoice_repo.get_by_unique_amount(db, unique_amount)
            if not existing or existing.status in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
                # Found a unique one (or one that was already paid/cancelled, though best to be strictly unique globally pending)
                # Let's ensure strict uniqueness across PENDING invoices
                if not existing or existing.status != InvoiceStatus.PENDING:
                    invoice_data = {
                        "user_id": user_id,
                        "base_amount": base_amount,
                        "unique_amount": unique_amount,
                        "due_date": due_date,
                        "status": InvoiceStatus.PENDING
                    }
                    return await invoice_repo.create(db, invoice_data)
        
        raise InvalidOperation("Could not generate a unique invoice amount")

    @staticmethod
    async def get_user_invoices(db: AsyncSession, user_id: int):
        return await invoice_repo.get_by_user_id(db, user_id)

class PaymentService:
    @staticmethod
    async def confirm_payment(db: AsyncSession, unique_amount: float, payment_method: str, transaction_id: str = None, proof_image: str = None):
        invoice = await invoice_repo.get_by_unique_amount(db, unique_amount)
        if not invoice:
            raise EntityNotFound("Invoice with this exact amount not found")
            
        if invoice.status == InvoiceStatus.PAID:
            raise InvalidOperation("Invoice is already paid")
            
        # Create payment record
        payment_data = {
            "user_id": invoice.user_id,
            "invoice_id": invoice.id,
            "amount": unique_amount,
            "payment_method": payment_method,
            "transaction_id": transaction_id,
            "proof_image": proof_image,
            "status": PaymentStatus.CONFIRMED
        }
        payment = await payment_repo.create(db, payment_data)
        
        # Mark invoice as paid
        invoice.status = InvoiceStatus.PAID
        await db.commit()
        
        # Activate subscription
        await SubscriptionService.activate_subscription(db, invoice.user_id, duration_months=1)
        
        return payment
