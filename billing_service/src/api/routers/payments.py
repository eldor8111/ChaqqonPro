from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.database import get_db_session
from src.domain.schemas import PaymentCreate, PaymentResponse
from src.application.services import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/confirm", response_model=PaymentResponse)
async def confirm_payment(payment: PaymentCreate, db: AsyncSession = Depends(get_db_session)):
    return await PaymentService.confirm_payment(
        db, 
        unique_amount=payment.amount,
        payment_method=payment.payment_method,
        transaction_id=payment.transaction_id,
        proof_image=payment.proof_image
    )
