@echo off
chcp 65001 >nul
cls
color 0E

echo.
echo ============================================
echo     UBT ADMIN PANEL (RESTORAN / KAFE)
echo ============================================
echo.

cd /d "%~dp0\.."

REM Eski processni o'chirish (agar ishga tushgan bo'lsa)
taskkill /F /IM node.exe >nul 2>&1

echo Server ishga tusharilmoqda...
timeout /t 2 /nobreak >nul

REM Server ni ishga tushirish va brauzer ni ochish
start "" npm run dev

REM Brauzer ni ochish (PowerShell orqali) - HoReCa turi bilan
timeout /t 5 /nobreak >nul
powershell -Command "Start-Process 'http://localhost:3005/?mode=admin'"

echo.
echo UBT ADMIN PANELI OCHILDI
echo.
echo Login oynasida HoReCa turi avtomat tanlanadi.
echo Do'kon kodi va parolingizni kiriting.
echo.
pause
