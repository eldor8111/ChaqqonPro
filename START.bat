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
timeout /t 2 /nobreak >nul

echo.
echo 2. Backend (FastAPI) ishga tushirilmoqda...
cd /d "%~dp0\backend"
start "SMART Backend" cmd.exe /k ".\venv\Scripts\activate && uvicorn main:app --reload --port 8000"
timeout /t 3 /nobreak >nul

echo.
echo 3. Frontend (Next.js PRODUCTION) ishga tushirilmoqda...
cd /d "%~dp0\frontend"

REM .next papkasi mavjudligini tekshirish
if not exist ".next\BUILD_ID" (
    echo    [!] Build topilmadi. Birinchi marta build qilinmoqda...
    echo    Bu 2-3 daqiqa vaqt olishi mumkin. Kuting...
    call npm run build
    if errorlevel 1 (
        echo    [XATO] Build muvaffaqiyatsiz! npm run build ishga tushmadi.
        echo    Muammo: node_modules yoki .env fayliga tekshiring.
        pause
        exit /b 1
    )
)

echo    [OK] Build mavjud. Production server ishga tushirilmoqda (port 3005)...
start "SMART Frontend" cmd.exe /k "npm start"
timeout /t 8 /nobreak >nul

echo.
echo 4. Tizim sahifasi ochilmoqda...
start http://localhost:3005/

echo.
echo ============================================
echo   TIZIM MUVAFFAQIYATLI ISHGA TUSHIRILDI!
echo ============================================
echo   Frontend:  http://localhost:3005
echo   Backend:   http://localhost:8000
echo.
echo   [Printer xatosi haqida]
echo   Agar "Unable to connect" printer xatosi chiqsa:
echo   Admin panel ^> Sozlamalar ^> Printerlar sahifasiga kiring
echo   va printerning to'g'ri IP manzilini kiriting.
echo.
echo Ochiq oynalarni yopmang (orqa fonda ishlashda davom etadi).
pause
