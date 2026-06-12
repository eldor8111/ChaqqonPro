from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.database import get_db_session
from src.domain.schemas import InvoiceCreate, InvoiceResponse
from src.application.services import InvoiceService
from typing import List

router = APIRouter(prefix="/invoices", tags=["Invoices"])

@router.post("/generate", response_model=InvoiceResponse)
async def generate_invoice(invoice_req: InvoiceCreate, db: AsyncSession = Depends(get_db_session)):
    return await InvoiceService.generate_invoice(db, invoice_req.user_id, invoice_req.base_amount, invoice_req.due_date)

@router.get("/{user_id}", response_model=List[InvoiceResponse])
async def get_user_invoices(user_id: int, db: AsyncSession = Depends(get_db_session)):
    return await InvoiceService.get_user_invoices(db, user_id)
