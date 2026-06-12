@echo off
chcp 65001 >nul
cls
color 0A

echo ============================================================
echo       SMART POS — TO'LIQ BUILD JARAYONI
echo       Online + Offline yagona EXE installer
echo ============================================================
echo.

set ROOT=%~dp0
set NEXTJS_DIR=%ROOT%frontend
set ELECTRON_DIR=%ROOT%desktop
set STANDALONE_DST=%ELECTRON_DIR%\nextjs-standalone
set DATABASE_DST=%ELECTRON_DIR%\database

:: ── 1. Next.js build ───────────────────────────────────────────────
echo [1/4] Next.js ilovasini build qilish (standalone mode)...
cd /d "%NEXTJS_DIR%"
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [XATO] Next.js build muvaffaqiyatsiz tugadi!
    pause
    exit /b 1
)
echo   OK: Next.js build yakunlandi.

:: ── 2. Standalone fayllarni ko'chirish ────────────────────────────
echo.
echo [2/4] Standalone fayllarni Electron papkasiga ko'chirish...

if exist "%STANDALONE_DST%" (
    echo   Eski standalone o'chirilmoqda...
    rmdir /s /q "%STANDALONE_DST%"
)
mkdir "%STANDALONE_DST%"

:: server.js va node_modules (standalone)
xcopy /E /I /Y "%NEXTJS_DIR%\.next\standalone\." "%STANDALONE_DST%\"
if %errorlevel% neq 0 (
    echo [XATO] Standalone fayllarni ko'chirib bo'lmadi!
    pause
    exit /b 1
)

:: Static fayllar (.next/static)
if exist "%NEXTJS_DIR%\.next\static" (
    xcopy /E /I /Y "%NEXTJS_DIR%\.next\static\." "%STANDALONE_DST%\.next\static\"
    echo   OK: .next/static ko'chirildi.
)

:: Public papka
if exist "%NEXTJS_DIR%\public" (
    xcopy /E /I /Y "%NEXTJS_DIR%\public\." "%STANDALONE_DST%\public\"
    echo   OK: public/ ko'chirildi.
)

echo   OK: Standalone fayllar tayyor.

:: ── 3. SQLite ma'lumotlar bazasini ko'chirish ─────────────────────
echo.
echo [3/4] SQLite bazasini ko'chirish (offline uchun boshlang'ich data)...

if not exist "%DATABASE_DST%" mkdir "%DATABASE_DST%"

if exist "%NEXTJS_DIR%\prisma\dev.db" (
    copy /Y "%NEXTJS_DIR%\prisma\dev.db" "%DATABASE_DST%\pos.db"
    echo   OK: dev.db -^> database/pos.db
) else if exist "%NEXTJS_DIR%\prisma\pos.db" (
    copy /Y "%NEXTJS_DIR%\prisma\pos.db" "%DATABASE_DST%\pos.db"
    echo   OK: pos.db -^> database/pos.db
) else (
    echo   DIQQAT: Baza fayli topilmadi.
    echo   Offline rejimda birinchi ishga tushirilganda bosh baza yaratiladi.
    echo. > "%DATABASE_DST%\.keep"
)

:: ── 4. Electron installer yaratish ────────────────────────────────
echo.
echo [4/4] Electron installer (NSIS .exe) yaratilmoqda...
cd /d "%ELECTRON_DIR%"
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [XATO] Electron build muvaffaqiyatsiz tugadi!
    pause
    exit /b 1
)

:: ── 5. Oraliq papkalarni tozalash ──────────────────────────────────
echo.
echo [5/5] Tozalash (win-unpacked o'chirilmoqda)...
if exist "%ELECTRON_DIR%\dist\win-unpacked" (
    rmdir /s /q "%ELECTRON_DIR%\dist\win-unpacked"
    echo   OK: win-unpacked o'chirildi.
)

echo.
echo ============================================================
echo   BUILD MUVAFFAQIYATLI YAKUNLANDI!
echo.
echo   Installer joyi:
echo   %ELECTRON_DIR%\dist\SMART-POS-Setup.exe
echo.
echo   Faqat bitta fayl: SMART-POS-Setup.exe
echo   O'rnatgandan keyin ish stoliga yorliq qo'shiladi.
echo ============================================================
echo.
pause
