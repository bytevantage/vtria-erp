@echo off
echo ========================================
echo  VTRIA ERP - Simple Copy Setup
echo ========================================
echo.
echo This script sets up VTRIA ERP after copying
echo the entire folder from MacBook to Windows.
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Please run this script from the vtria-erp project root directory.
    echo Example: cd C:\Projects\vtria-erp
    pause
    exit /b 1
)

echo Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed.
    echo Please download from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✓ Node.js is installed
)

REM Check npm
npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: npm is not installed.
    pause
    exit /b 1
) else (
    echo ✓ npm is installed
)

REM Check Git
git --version >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: Git is not installed.
    echo You can still proceed, but Git is recommended.
    echo Download from: https://gitforwindows.org/
) else (
    echo ✓ Git is installed
)

REM Check Docker
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: Docker is not installed.
    echo You can still proceed with manual setup.
    echo Download from: https://www.docker.com/products/docker-desktop/
) else (
    echo ✓ Docker is installed
)

echo.
echo ========================================
echo  Setting up project...
echo ========================================

REM Clean old node_modules (from Mac)
echo Cleaning old node_modules...
if exist "node_modules" rmdir /s /q node_modules
if exist "api\node_modules" rmdir /s /q api\node_modules
if exist "client\node_modules" rmdir /s /q client\node_modules

REM Install dependencies
echo Installing root dependencies...
npm install

echo Installing API dependencies...
cd api
npm install
cd ..

echo Installing client dependencies...
cd client
npm install
cd ..

echo.
echo ========================================
echo  Setting up environment files...
echo ========================================

REM Setup API environment
if not exist "api\.env" (
    if exist "api\.env.example" (
        copy api\.env.example api\.env
        echo ✓ Created api\.env from template
    ) else (
        echo WARNING: api\.env.example not found
    )
) else (
    echo ✓ api\.env already exists
)

REM Setup client environment
if not exist "client\.env" (
    if exist "client\.env.example" (
        copy client\.env.example client\.env
        echo ✓ Created client\.env from template
    ) else (
        echo WARNING: client\.env.example not found
    )
) else (
    echo ✓ client\.env already exists
)

echo.
echo ========================================
echo  Creating necessary directories...
echo ========================================

REM Create directories
if not exist "uploads" mkdir uploads
if not exist "logs" mkdir logs
if not exist "backups" mkdir backups
if not exist "api\uploads" mkdir api\uploads
if not exist "api\logs" mkdir api\logs
if not exist "api\backups" mkdir api\backups

echo ✓ Created necessary directories

echo.
echo ========================================
echo  Setup complete!
echo ========================================
echo.
echo 🎉 GREAT NEWS: Database is ALREADY in Docker!
echo    No external MySQL/PostgreSQL installation needed!
echo.
echo Next steps:
echo.
echo 1. START APPLICATION (includes database):
echo    docker-compose up -d
echo.
echo 2. ACCESS APPLICATION:
echo    Frontend: http://localhost:3000
echo    API: http://localhost:3001
echo    API Docs: http://localhost:3001/api-docs
echo    Database UI: http://localhost:8080
echo.
echo 3. DEFAULT LOGIN:
echo    Email: admin@vtria.com
echo    Password: VtriaAdmin@2024
echo.
echo For detailed instructions, see DOCKER_DATABASE_SETUP.md
echo.
pause