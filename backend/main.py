import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routers import users, subscriptions, invoices, payments, access

app = FastAPI(
    title="SaaS Billing System",
    description="Production-ready billing service for UBT POS",
    version="1.0.0"
)

def get_allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3005,http://127.0.0.1:3005")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(users.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(invoices.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(access.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to the SaaS Billing System API"}
