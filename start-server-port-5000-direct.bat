@echo off
echo ===================================================
echo        VTRIA ERP Server on Port 5000
echo ===================================================
echo.

:: Kill any existing Node.js processes on port 3000 or 5000
echo Checking for existing Node.js processes on ports 3000 and 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Found process on port 3000 with PID: %%a
    taskkill /F /PID %%a
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Found process on port 5000 with PID: %%a
    taskkill /F /PID %%a
)

:: Set environment variables
set PORT=5000
set NODE_ENV=development

echo.
echo [INFO] Starting VTRIA ERP Server on port 5000...
echo [INFO] Server will be available at: http://localhost:5000
echo [INFO] Frontend will be available at: http://localhost:8080/vtria-erp/
echo [INFO] Default admin credentials: admin@vtria.com / VtriaAdmin@2024
echo.
echo [INFO] Press Ctrl+C to stop the server
echo ===================================================

:: Change to server directory
cd /d C:\wamp64\www\vtria-erp\server

:: Start the server with explicit port
node src/server.js
