@echo off
echo ===================================================
echo        VTRIA ERP Server - No Shutdown Mode
echo ===================================================
echo.

:: Kill any existing Node.js processes on port 5000
echo Checking for existing Node.js processes on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Found process on port 5000 with PID: %%a
    taskkill /F /PID %%a
)

:: Set environment variables
set PORT=5000
set NODE_ENV=development
set IGNORE_SIGINT=true

echo.
echo [INFO] Starting VTRIA ERP Server on port 5000...
echo [INFO] Server will be available at: http://localhost:5000
echo [INFO] Frontend will be available at: http://localhost:8080/vtria-erp/
echo [INFO] Default admin credentials: admin@vtria.com / VtriaAdmin@2024
echo.
echo [INFO] Server is configured to ignore shutdown signals
echo [INFO] To stop the server, you must close this window or use Task Manager
echo ===================================================

:: Change to server directory
cd /d C:\wamp64\www\vtria-erp\server

:: Start the server with explicit port and ignore SIGINT
node src/server.js

pause
