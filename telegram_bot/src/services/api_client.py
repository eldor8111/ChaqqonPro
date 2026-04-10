import aiohttp
from src.core.config import settings

class APIClient:
    def __init__(self):
        self.base_url = settings.API_URL

    async def register_user(self, name: str, phone: str, telegram_id: str):
        async with aiohttp.ClientSession() as session:
            payload = {
                "name": name,
                "phone": phone,
                "telegram_id": telegram_id,
                "status": "ACTIVE"
            }
            async with session.post(f"{self.base_url}/users/", json=payload) as response:
                if response.status in [200, 201]:
                    return await response.json()
                return None

    async def get_user_by_telegram_id(self, telegram_id: str):
        # We might not have a direct endpoint for telegram_id, but assuming a simple mock or we just register
        # We will assume /users endpoint might create or just fail if exists. To be solid:
        pass # In a real system, we'd add GET /users/telegram/{id}. Here we just blindly try creating or handling.
        
    async def generate_invoice(self, user_id: int):
        # Generates a standard invoice (e.g. $50.00 base amount + unique suffix)
        import datetime
        from dateutil.relativedelta import relativedelta
        async with aiohttp.ClientSession() as session:
            payload = {
                "user_id": user_id,
                "base_amount": 50000, # e.g. 50,000 UZS
                "due_date": (datetime.datetime.utcnow() + relativedelta(days=3)).isoformat()
            }
            async with session.post(f"{self.base_url}/invoices/generate", json=payload) as response:
                if response.status in [200, 201]:
                    return await response.json()
                return None

    async def confirm_payment(self, amount: float, proof_image: str):
        async with aiohttp.ClientSession() as session:
            payload = {
                "amount": amount,
                "payment_method": "TELEGRAM_TRANSFER",
                "proof_image": proof_image
            }
            async with session.post(f"{self.base_url}/payments/confirm", json=payload) as response:
                return response.status in [200, 201]

api_client = APIClient()
