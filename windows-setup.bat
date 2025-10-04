@echo off
echo ========================================
echo  VTRIA ERP - Windows Setup Script
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator privileges confirmed.
) else (
    echo Please run this script as Administrator.
    pause
    exit /b 1
)

echo Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
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
    echo ERROR: Git is not installed. Please install Git from https://gitforwindows.org/
    pause
    exit /b 1
) else (
    echo ✓ Git is installed
)

REM Check Docker
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
) else (
    echo ✓ Docker is installed
)

echo.
echo ========================================
echo  Setting up project structure...
echo ========================================

REM Create project directory
if not exist "C:\Projects" mkdir C:\Projects
cd C:\Projects

REM Clone or copy repository
if not exist "vtria-erp" (
    echo Cloning VTRIA ERP repository...
    git clone <YOUR_REPOSITORY_URL> vtria-erp
) else (
    echo Project directory already exists.
)

cd vtria-erp

echo.
echo ========================================
echo  Installing dependencies...
echo ========================================

REM Install root dependencies
echo Installing root dependencies...
npm install

REM Install API dependencies
echo Installing API dependencies...
cd api
npm install
cd ..

REM Install client dependencies
echo Installing client dependencies...
cd client
npm install
cd ..

echo.
echo ========================================
echo  Configuring environment...
echo ========================================

REM Setup API environment
cd api
if not exist ".env" (
    copy .env.example .env
    echo ✓ Created API .env file
) else (
    echo ✓ API .env file already exists
)

REM Setup client environment
cd ../client
if not exist ".env" (
    copy .env.example .env
    echo ✓ Created client .env file
) else (
    echo ✓ Client .env file already exists
)

cd ..

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
echo  Windows setup complete!
echo ========================================
echo.
echo Next steps:
echo 1. Configure your .env files with correct database credentials
echo 2. Set up your database (MySQL/PostgreSQL)
echo 3. Run the database migrations
echo 4. Start the application using Docker or manually
echo.
echo For detailed instructions, see WINDOWS_MIGRATION_GUIDE.md
echo.
pause