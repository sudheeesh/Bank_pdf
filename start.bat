@echo off
REM Quick Start Script for PDF & ODF Editor Suite (Windows)

echo ======================================
echo   PDF ^& ODF Document Editor Suite
echo ======================================
echo.

echo Installing dependencies...
call npm install

if errorlevel 1 (
    echo Error: npm install failed
    pause
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.

echo Starting server...
call npm start

echo.
echo 📍 Access points:
echo    Home:        http://localhost:3000
echo    PDF Editor:  http://localhost:3000/viewer
echo    ODF Editor:  http://localhost:3000/odf-editor
echo.
pause
