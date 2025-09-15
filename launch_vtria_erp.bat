@echo off
title VTRIA ERP System Launcher

echo.
echo =============================================
echo      VTRIA Engineering Solutions Pvt Ltd
echo              ERP System Launcher
echo =============================================
echo.

REM Check prerequisites
echo [1/5] Checking Prerequisites...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js
    pause
    exit /b 1
)
echo ✓ Node.js is installed

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found! Please install npm
    pause
    exit /b 1
)
echo ✓ npm is installed

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker not found! Please install Docker
    pause
    exit /b 1
)
echo ✓ Docker is installed

echo.
echo [2/5] Starting Database...

REM Start database
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start database
    pause
    exit /b 1
)

REM Wait for database
echo Waiting for database to be ready...
timeout /t 5 >nul

echo.
echo [3/5] Starting Backend API Server...

REM Create logs directory
if not exist "logs" mkdir logs

REM Start backend server
cd api
start "VTRIA Backend" cmd /k "node src/server.js"
cd ..

REM Wait for backend
timeout /t 3 >nul

echo.
echo [4/5] Installing Frontend Dependencies...

REM Go to client directory and install dependencies
cd client

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo [5/5] Starting Frontend Application...

REM Start React app
start "VTRIA Frontend" cmd /k "npm start"

cd ..

echo.
echo =============================================
echo    VTRIA ERP System is starting up!
echo =============================================
echo.
echo Access URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo   Health:   http://localhost:3001/health
echo.
echo Please wait 30-60 seconds for the React app to load.
echo.
echo Press any key to continue...
pause >nul

REM Try to open browser
start http://localhost:3000

echo.
echo VTRIA ERP System launched successfully!
echo.
echo To stop the system, close the terminal windows or use:
echo   docker-compose down
echo.
pause
