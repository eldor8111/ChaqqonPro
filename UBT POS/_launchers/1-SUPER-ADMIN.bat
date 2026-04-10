@echo off
chcp 65001 >nul
cls
color 0F

echo.
echo ============================================
echo     SUPER ADMIN PANEL
echo ============================================
echo.

cd /d "%~dp0\.."

REM Eski processni o'chirish (agar ishga tushgan bo'lsa)
taskkill /F /IM node.exe >nul 2>&1

echo Server ishga tusharilmoqda...
timeout /t 2 /nobreak >nul

REM Server ni ishga tushirish va brauzer ni ochish
start "" npm run dev

REM Brauzer ni ochish (PowerShell orqali)
timeout /t 5 /nobreak >nul
powershell -Command "Start-Process 'http://localhost:3005/super-admin/login'"

echo.
echo SUPER ADMIN PANELI OCHILDI
echo.
echo Login ma'lumotlari:
echo Parol: superadmin123
echo.
pause
