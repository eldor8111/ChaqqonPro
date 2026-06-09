from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from src.infrastructure.orm_models import UserStatus, SubscriptionStatus, InvoiceStatus, PaymentStatus

# Users
class UserBase(BaseModel):
    name: str
    phone: str
    telegram_id: Optional[str] = None
    status: UserStatus = UserStatus.ACTIVE

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Subscriptions
class SubscriptionBase(BaseModel):
    user_id: int
    tariff_name: str
    price: float
    billing_cycle: str
    next_payment_date: datetime
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionResponse(SubscriptionBase):
    id: int
    class Config:
        from_attributes = True

# Invoices
class InvoiceBase(BaseModel):
    user_id: int
    base_amount: float
    due_date: datetime

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceResponse(InvoiceBase):
    id: int
    unique_amount: float
    status: InvoiceStatus
    created_at: datetime
    class Config:
        from_attributes = True

# Payments
class PaymentBase(BaseModel):
    amount: float
    payment_method: str
    transaction_id: Optional[str] = None
    proof_image: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: int
    user_id: int
    invoice_id: Optional[int]
    status: PaymentStatus
    created_at: datetime
    class Config:
        from_attributes = True
