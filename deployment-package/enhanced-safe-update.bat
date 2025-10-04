@echo off
REM Windows Batch wrapper for enhanced-safe-update.ps1

echo 🚀 VTRIA ERP SAFE UPDATE - Windows Batch Launcher
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell is available'" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ ERROR: PowerShell is required but not available
    echo Please ensure PowerShell is installed and available in PATH
    pause
    exit /b 1
)

echo ✅ PowerShell detected
echo.

REM Show usage options
echo 📋 SAFE UPDATE OPTIONS:
echo.
echo 1. Quick Update (Code only)
echo 2. Full Update (Code + preserve user data)  
echo 3. Complete Update (Code + user data + migrations)
echo 4. Dry Run (Preview changes only)
echo 5. Custom Options
echo.

set /p choice="Select option (1-5): "

if "%choice%"=="1" (
    echo 🔄 Running Quick Update...
    powershell -ExecutionPolicy Bypass -File "enhanced-safe-update.ps1"
) else if "%choice%"=="2" (
    echo 🔄 Running Full Update with User Data Preservation...
    powershell -ExecutionPolicy Bypass -File "enhanced-safe-update.ps1" -PreserveUserData
) else if "%choice%"=="3" (
    echo 🔄 Running Complete Update with Migrations...
    powershell -ExecutionPolicy Bypass -File "enhanced-safe-update.ps1" -PreserveUserData -RunMigrations -VerifyData
) else if "%choice%"=="4" (
    echo 🧪 Running Dry Run...
    powershell -ExecutionPolicy Bypass -File "enhanced-safe-update.ps1" -PreserveUserData -RunMigrations -VerifyData -DryRun
) else if "%choice%"=="5" (
    echo.
    echo 🛠️ CUSTOM OPTIONS:
    echo Available parameters:
    echo   -PreserveUserData  : Backup and restore uploads, logs, config
    echo   -RunMigrations     : Execute database schema migrations
    echo   -VerifyData        : Check data integrity before/after
    echo   -DryRun           : Preview changes without executing
    echo   -NewVersionPath   : Path to new version folder
    echo.
    set /p custom_params="Enter PowerShell parameters: "
    echo 🔄 Running Custom Update...
    powershell -ExecutionPolicy Bypass -File "enhanced-safe-update.ps1" %custom_params%
) else (
    echo ❌ Invalid choice. Please select 1-5.
    pause
    goto :EOF
)

echo.
echo ✅ Update process completed!
echo Check the output above for any errors or warnings.
echo.
pause