@echo off
echo ========================================
echo  VTRIA ERP - Remote Sync Script
echo ========================================
echo.

REM Configuration - Update these variables
set WINDOWS_IP=YOUR_WINDOWS_IP_ADDRESS
set WINDOWS_USER=your_windows_username
set PROJECT_PATH=/Users/srbhandary/Documents/Projects/vtria-erp
set REMOTE_PATH=/c/Projects/vtria-erp

echo Syncing code from MacBook to Windows...
echo Source: %PROJECT_PATH%
echo Target: %WINDOWS_USER%@%WINDOWS_IP%:%REMOTE_PATH%
echo.

REM Check if rsync is available (requires Cygwin or similar)
where rsync >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: rsync is not installed.
    echo Please install Cygwin or use an alternative sync method.
    echo Alternative: Use Git-based sync or manual file copy.
    pause
    exit /b 1
)

REM Sync files using rsync
echo Starting file synchronization...
rsync -avz --delete --exclude='node_modules' --exclude='.git' --exclude='*.log' --exclude='.DS_Store' --exclude='Thumbs.db' ^
  "%PROJECT_PATH%/" ^
  "%WINDOWS_USER%@%WINDOWS_IP%:%REMOTE_PATH%/"

if %errorLevel% neq 0 (
    echo ERROR: File sync failed.
    pause
    exit /b 1
)

echo.
echo File sync complete. Restarting Windows services...

REM Restart Docker services on Windows
ssh %WINDOWS_USER%@%WINDOWS_IP% "cd /c/Projects/vtria-erp && docker-compose restart"

if %errorLevel% neq 0 (
    echo ERROR: Service restart failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Remote sync complete!
echo ========================================
echo.
echo Your changes have been deployed to Windows.
echo Access your application at: http://%WINDOWS_IP%:3000
echo.
pause