@echo off
echo ========================================
echo   Password Manager - Deployment Script
echo ========================================
echo.

echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18.0.0+ from https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js is installed

echo.
echo [2/6] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo ✓ Dependencies installed

echo.
echo [3/6] Setting up database...
call npm run setup:db
if errorlevel 1 (
    echo ERROR: Failed to setup database!
    pause
    exit /b 1
)
echo ✓ Database setup complete

echo.
echo [4/6] Running deployment tests...
call npm run test:deployment
if errorlevel 1 (
    echo ERROR: Deployment tests failed!
    pause
    exit /b 1
)
echo ✓ All tests passed

echo.
echo [5/6] Building Windows installer...
call npm run dist:win
if errorlevel 1 (
    echo WARNING: Failed to build installer (optional)
    echo You can still run the application manually
)
echo ✓ Build process completed

echo.
echo [6/6] Starting server...
echo.
echo ========================================
echo   DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo Server will start on: http://localhost:3001
echo Login with: admin@company.com / admin123
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node src/server/server.js
