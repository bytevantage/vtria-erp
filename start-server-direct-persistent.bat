@echo off
echo ========================================================
echo VTRIA ERP Server - Direct Persistent Mode
echo ========================================================
echo This window will remain open to show server status
echo To stop the server, you must close this window or use Task Manager
echo.

:: Set environment variables
set PORT=5000
set NODE_ENV=development
set IGNORE_SIGINT=true

:: Kill any existing Node.js processes on port 5000
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') DO (
    echo Killing existing process on port 5000: %%P
    taskkill /F /PID %%P
)

echo.
echo Starting server in persistent mode with SIGINT handling disabled...
echo Server will be available at: http://localhost:5000
echo.

:: Start the server with the direct-start.js script
node direct-start.js

pause
