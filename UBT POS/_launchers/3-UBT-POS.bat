@echo off
chcp 65001 >nul
cls
color 0B

echo.
echo ============================================
echo   UBT POS (OFITSIANT / KASSIR PANEL)
echo ============================================
echo.

cd /d "%~dp0\.."

REM Eski processni o'chirish (agar ishga tushgan bo'lsa)
taskkill /F /IM node.exe >nul 2>&1

echo Server ishga tushirilmoqda...
timeout /t 2 /nobreak >nul

REM Server ni ishga tushirish
start "" npm run dev

REM Brauzer ni ochish (PowerShell orqali)
timeout /t 5 /nobreak >nul
powershell -Command "Start-Process 'http://localhost:3005/kassa/login'"

echo.
echo UBT POS PANELI OCHILDI
echo.
echo Login oynasida do'kon kodi va parolingizni kiriting.
echo.
pause
