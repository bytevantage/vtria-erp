@echo off
REM VTRIA ERP Development Startup Script for Windows
REM This script handles port cleanup and starts both API and client servers

echo 🚀 Starting VTRIA ERP Development Environment
echo =============================================

REM Function to kill processes on specific ports
echo 🧹 Cleaning up potentially occupied ports...

REM Kill processes on common development ports
for %%p in (3000 3001 3002 3003 3004 3005 5000) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| find "TCP" ^| find ":%%p "') do (
        echo    Killing process %%a on port %%p
        taskkill /F /PID %%a >nul 2>&1
    )
)

REM Wait for ports to be released
timeout /t 2 /nobreak >nul
echo ✓ Port cleanup completed

REM Setup environment
echo.
echo 🔧 Setting up environment...

REM Create client .env if it doesn't exist
if not exist "client\.env" (
    echo REACT_APP_API_URL=http://localhost:3001> client\.env
    echo GENERATE_SOURCEMAP=false>> client\.env
    echo SKIP_PREFLIGHT_CHECK=true>> client\.env
    echo    Created client\.env file
)

REM Check if API .env exists
if not exist "api\.env" (
    echo ⚠️ API .env file not found. Please ensure it exists before continuing.
    pause
    exit /b 1
)

echo ✓ Environment setup completed

REM Start API Server
echo.
echo 📡 Starting API Server...
cd api

REM Install dependencies if needed
if not exist "node_modules" (
    echo    Installing API dependencies...
    call npm install
)

REM Start the API server in background
echo    Starting API server...
start /min cmd /c "npm run dev"

cd ..

REM Wait for API to be ready
echo    Waiting for API server to be ready...
timeout /t 5 /nobreak >nul

REM Start Client Application
echo.
echo 🌐 Starting Client Application...
cd client

REM Install dependencies if needed
if not exist "node_modules" (
    echo    Installing client dependencies...
    call npm install
)

REM Start the client
echo    Starting client application...
start /min cmd /c "npm start"

cd ..

REM Show status
echo.
echo 🎯 Development Environment Status
echo =================================
echo 📡 API Server: http://localhost:3001
echo 🌐 Client App: http://localhost:3000
echo 📚 API Docs: http://localhost:3001/api-docs
echo 🏥 Health Check: http://localhost:3001/health
echo.
echo Both servers are starting in separate windows.
echo Close those windows to stop the servers.
echo.
pause