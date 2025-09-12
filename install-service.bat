@echo off
echo ===================================================
echo        VTRIA ERP Windows Service Installer
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

:: Check if node-windows is installed
echo [INFO] Checking for node-windows package...
cd /d C:\wamp64\www\vtria-erp
if not exist node_modules\node-windows (
    echo [INFO] Installing node-windows package...
    npm install node-windows --save
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install node-windows package.
        pause
        exit /b 1
    )
    echo [INFO] node-windows package installed successfully.
)

echo.
echo [INFO] Installing VTRIA ERP Server as a Windows service...
echo [INFO] This will create a service that starts automatically when Windows boots.
echo [INFO] The service will run on port 5000 and will be configured to ignore shutdown signals.
echo.
echo [INFO] Press any key to continue or Ctrl+C to cancel...
pause > nul

:: Run the service installer script
node install-service.js

echo.
echo [INFO] If no errors appeared above, the service has been installed successfully.
echo [INFO] You can manage the service from Windows Services (services.msc)
echo [INFO] Service Name: VTRIA ERP Server
echo.
pause
