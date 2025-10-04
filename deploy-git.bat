@echo off
REM Git-based deployment launcher for VTRIA ERP
REM This script provides an easy interface for Git deployments

echo.
echo ========================================
echo   VTRIA ERP - Git Deployment Manager
echo ========================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ ERROR: Git is not installed!
    echo.
    echo 📥 Please install Git for Windows:
    echo    https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell available'" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ ERROR: PowerShell is required!
    echo.
    pause
    exit /b 1
)

echo ✅ Prerequisites checked: Git and PowerShell available
echo.

REM Show deployment options
echo 📋 DEPLOYMENT OPTIONS:
echo.
echo 1. First-time deployment (fresh install)
echo 2. Update deployment (preserve data)
echo 3. Update deployment (no backup)
echo 4. Deploy specific branch
echo 5. Check current status
echo 6. View deployment logs
echo.

set /p choice="Select option (1-6): "

if "%choice%"=="1" (
    echo.
    echo 🚀 FIRST-TIME DEPLOYMENT
    echo ⚠️ This will create a fresh installation at C:\vtria-erp
    echo.
    set /p confirm="Continue? (y/N): "
    if /i "!confirm!"=="y" (
        echo.
        echo 📥 Starting first-time deployment...
        powershell -ExecutionPolicy Bypass -File "deploy-git.ps1" -FirstTime -Verbose
    ) else (
        echo Cancelled.
    )
    
) else if "%choice%"=="2" (
    echo.
    echo 🔄 UPDATE DEPLOYMENT (with backup)
    echo 💾 This will backup user data before updating
    echo.
    set /p confirm="Continue? (y/N): "
    if /i "!confirm!"=="y" (
        echo.
        echo 📥 Starting update with backup...
        powershell -ExecutionPolicy Bypass -File "deploy-git.ps1" -BackupData -Verbose
    ) else (
        echo Cancelled.
    )
    
) else if "%choice%"=="3" (
    echo.
    echo 🔄 QUICK UPDATE (no backup)
    echo ⚠️ User data will not be backed up
    echo.
    set /p confirm="Continue? (y/N): "
    if /i "!confirm!"=="y" (
        echo.
        echo 📥 Starting quick update...
        powershell -ExecutionPolicy Bypass -File "deploy-git.ps1" -Verbose
    ) else (
        echo Cancelled.
    )
    
) else if "%choice%"=="4" (
    echo.
    echo 🌿 DEPLOY SPECIFIC BRANCH
    echo Current branches available:
    echo   - main (stable releases)
    echo   - production (production deployment)
    echo   - develop (latest development)
    echo.
    set /p branch="Enter branch name (default: production): "
    if "%branch%"=="" set branch=production
    
    echo.
    echo 📥 Deploying branch: %branch%
    set /p confirm="Continue? (y/N): "
    if /i "!confirm!"=="y" (
        powershell -ExecutionPolicy Bypass -File "deploy-git.ps1" -Branch "%branch%" -BackupData -Verbose
    ) else (
        echo Cancelled.
    )
    
) else if "%choice%"=="5" (
    echo.
    echo 📊 CURRENT STATUS
    echo.
    
    if exist "C:\vtria-erp" (
        echo ✅ VTRIA ERP installation found at C:\vtria-erp
        
        cd C:\vtria-erp
        
        if exist ".git" (
            echo ✅ Git repository detected
            
            REM Get current branch
            for /f %%i in ('git branch --show-current') do set current_branch=%%i
            echo 📍 Current branch: !current_branch!
            
            REM Check if services are running
            echo.
            echo 🔍 Checking Docker services...
            docker-compose -f docker-compose.windows.yml ps
            
            REM Check for updates
            echo.
            echo 📥 Checking for updates...
            git fetch origin >nul 2>&1
            for /f %%i in ('git rev-list HEAD...origin/!current_branch! --count') do set behind=%%i
            if "!behind!"=="0" (
                echo ✅ Up to date with remote
            ) else (
                echo ⚠️ !behind! commits behind remote
                echo 💡 Run option 2 to update
            )
            
        ) else (
            echo ❌ Not a Git repository
            echo 💡 Use option 1 for fresh Git deployment
        )
        
    ) else (
        echo ❌ VTRIA ERP not found at C:\vtria-erp
        echo 💡 Use option 1 for first-time deployment
    )
    
) else if "%choice%"=="6" (
    echo.
    echo 📄 DEPLOYMENT LOGS
    echo.
    
    if exist "C:\vtria-erp\logs" (
        echo 📋 Recent log files:
        dir C:\vtria-erp\logs\*.log /O:D /B 2>nul
        echo.
        
        set /p viewlog="Enter log filename to view (or press Enter to skip): "
        if not "!viewlog!"=="" (
            if exist "C:\vtria-erp\logs\!viewlog!" (
                echo.
                echo 📖 Last 20 lines of !viewlog!:
                echo ----------------------------------------
                powershell -Command "Get-Content 'C:\vtria-erp\logs\!viewlog!' | Select-Object -Last 20"
            ) else (
                echo ❌ Log file not found
            )
        )
    ) else (
        echo ❌ No logs directory found
    )
    
    REM Show Docker logs
    echo.
    echo 🐳 Docker container logs:
    set /p showdocker="Show Docker logs? (y/N): "
    if /i "!showdocker!"=="y" (
        echo.
        echo API Container logs:
        docker logs vtria-erp-api --tail 10
        echo.
        echo Frontend Container logs:
        docker logs vtria-erp-frontend --tail 10
    )
    
) else (
    echo ❌ Invalid choice. Please select 1-6.
)

echo.
echo 🎯 QUICK ACCESS URLS:
echo   Frontend: http://localhost:3000
echo   API: http://localhost:5000
echo.

if "%choice%" neq "5" if "%choice%" neq "6" (
    echo 💡 TIP: Use option 5 to check status anytime
    echo.
)

pause