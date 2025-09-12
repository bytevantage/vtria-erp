@echo off
echo ===================================================
echo        VTRIA ERP Server Debug Mode (Port 5000)
echo ===================================================
echo.

:: Kill any existing Node.js processes on port 5000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Found process on port 5000 with PID: %%a
    taskkill /F /PID %%a
    echo Killed process with PID: %%a
)

:: Change to server directory
cd /d %~dp0server

:: Set environment variables for debugging
set DEBUG=*
set NODE_ENV=development
set PORT=5000
set IGNORE_SIGINT=true

echo Current directory: %CD%
echo Environment variables:
echo - PORT=%PORT%
echo - NODE_ENV=%NODE_ENV%
echo - DEBUG=%DEBUG%
echo - IGNORE_SIGINT=%IGNORE_SIGINT%
echo.

echo Starting server with explicit port 5000...
echo Server will be available at: http://localhost:5000
echo.

echo Starting server at %time% >> ..\server_output.log
echo Environment variables: >> ..\server_output.log
echo PORT=%PORT% >> ..\server_output.log
echo NODE_ENV=%NODE_ENV% >> ..\server_output.log
echo IGNORE_SIGINT=%IGNORE_SIGINT% >> ..\server_output.log
echo. >> ..\server_output.log
node src/server.js >> ..\server_output.log 2>&1

echo.
echo Server process exited. Check server_output.log for details.
pause
