@echo off
echo Starting VTRIA ERP Server in persistent mode (ignoring SIGINT signals)...
echo This window will remain open to show server status
echo To stop the server, you must close this window or use Task Manager

:: Set environment variables
set PORT=5000
set NODE_ENV=development

:: Kill any existing Node.js processes on port 5000
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') DO (
    echo Killing existing process on port 5000: %%P
    taskkill /F /PID %%P
)

:: Start the server with the debug script
node server-debug.js

pause
