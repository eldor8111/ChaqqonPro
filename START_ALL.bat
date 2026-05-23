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
echo 2. Billing Service (Backend) ishga tushirilmoqda...
cd /d "%~dp0\billing_service"
start "Billing Service" cmd.exe /c ".\venv\Scripts\activate && uvicorn main:app --reload --port 8000"
timeout /t 3 /nobreak >nul

echo.
echo 3. UBT POS (Frontend) ishga tushirilmoqda...
cd /d "%~dp0\UBT POS"
start "UBT POS Frontend" cmd.exe /c "npm run dev"
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
