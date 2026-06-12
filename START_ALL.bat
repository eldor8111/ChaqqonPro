@echo off
chcp 65001 >nul
cls
color 0A

echo ============================================
echo      SMART TIZIMINI ISHGA TUSHIRISH
echo ============================================
echo.

echo 1. Eski jarayonlarni tozalash...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM uvicorn.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1

echo.
echo 2. Backend (Billing Service) ishga tushirilmoqda...
cd /d "%~dp0\backend"
start "Backend" cmd.exe /c ".\venv\Scripts\activate && uvicorn main:app --reload --port 8000"
timeout /t 3 /nobreak >nul

echo.
echo 3. Frontend (Next.js) ishga tushirilmoqda...
cd /d "%~dp0\frontend"
start "Frontend" cmd.exe /c "npm run dev"
timeout /t 7 /nobreak >nul

echo.
echo 4. Tizim sahifasi ochilmoqda...
start http://localhost:3005/super-admin/login

echo.
echo ============================================
echo   TIZIM MUVAFFAQIYATLI ISHGA TUSHIRILDI!
echo ============================================
echo Ochiq oynalarni yopmang (orqa fonda ishlashda davom etadi).
pause
