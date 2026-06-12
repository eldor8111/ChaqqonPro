# Run Instructions for UBT POS Billing Service

## 1. Prerequisites
- Python 3.10+
- PostgreSQL database running (e.g. locally on port 5432)

## 2. Setup Environment
Open your terminal and navigate to this directory (`billing_service`). Follow these steps:

### Create virtual environment
```bash
python -m venv venv
```

### Activate it
**Windows:**
```powershell
.\venv\Scripts\Activate
```
**Linux/Mac:**
```bash
source venv/bin/activate
```

### Install dependencies
```bash
pip install -r requirements.txt
```

## 3. Database Configuration
1. Ensure your PostgreSQL database is running and create a database named `billing_db`.
2. Create your `.env` file by copying `.env.example`:
```bash
cp .env.example .env
```
*(Update `DATABASE_URL` in `.env` if your database credentials differ).*

## 4. Initializing the Database (Migrations)
Run Alembic autogenerate to create your database tables:
```bash
alembic revision --autogenerate -m "Initial migrations"
alembic upgrade head
```

## 5. Starting the Server
Start the FastAPI server via Uvicorn:
```bash
uvicorn main:app --reload
```
You can now access the Swagger UI directly in your browser: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).
