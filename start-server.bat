@echo off
echo ===================================================
echo        VTRIA ERP Node.js Server Starter
echo ===================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js and try again.
    pause
    exit /b 1
)

:: Display Node.js version
echo [INFO] Using Node.js version:
node -v
echo [INFO] Using NPM version:
npm -v
echo.

:: Navigate to server directory
echo [INFO] Changing to server directory...
cd /d C:\wamp64\www\vtria-erp\server
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to change directory to server folder.
    echo Please make sure the path exists: C:\wamp64\www\vtria-erp\server
    pause
    exit /b 1
)

:: Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found. Creating from .env.example...
    if exist .env.example (
        copy .env.example .env
        echo [INFO] Created .env file from .env.example
    ) else (
        echo [ERROR] .env.example file not found. Cannot create .env file.
        pause
        exit /b 1
    )
)

:: Check if node_modules exists
if not exist node_modules\ (
    echo [WARNING] node_modules not found. Installing dependencies...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [INFO] Dependencies installed successfully.
)

echo.
echo [INFO] Starting VTRIA ERP Server on port 5000...
echo [INFO] Server is now running on http://localhost:5000
echo [INFO] Frontend will be available at: http://localhost:8080/vtria-erp/
echo [INFO] Default admin credentials: admin@vtria.com / VtriaAdmin@2024
echo.
echo [INFO] Press Ctrl+C to stop the server
echo ===================================================

:: Set environment variables
set PORT=5000
set NODE_ENV=development
set IGNORE_SIGINT=true

:: Use node directly instead of npm start to ensure environment variables are used
echo [INFO] Starting server with SIGINT signal handling disabled
node src/server.js
