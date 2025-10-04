@echo off
echo ========================================
echo  VTRIA ERP - Quick Start Script
echo ========================================
echo.

cd /d C:\Projects\vtria-erp

echo Starting VTRIA ERP services...
echo.

REM Start Docker services
echo Starting Docker containers...
docker-compose -f docker-compose.windows.yml up -d

if %errorLevel% neq 0 (
    echo ERROR: Failed to start Docker services.
    echo Make sure Docker Desktop is running and try again.
    pause
    exit /b 1
)

echo.
echo Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Check service status
echo Checking service status...
docker-compose -f docker-compose.windows.yml ps

echo.
echo ========================================
echo  Services Status
echo ========================================
echo.

REM Test API health
echo Testing API health...
curl -s http://localhost:3002/health >nul 2>&1
if %errorLevel% equ 0 (
    echo ✓ API Server: Running on http://localhost:3002
) else (
    echo ✗ API Server: Not responding
)

REM Test database connection
echo Testing database connection...
docker-compose -f docker-compose.windows.yml exec -T db mysql -u vtria_user -pvtria_password vtria_erp -e "SELECT 1;" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✓ Database: Connected
) else (
    echo ✗ Database: Connection failed
)

echo.
echo ========================================
echo  Access URLs
echo ========================================
echo.
echo Frontend:     http://localhost:3000
echo API:          http://localhost:3002
echo API Docs:     http://localhost:3002/api-docs
echo Database UI:  http://localhost:8080
echo Redis UI:     http://localhost:8081
echo.
echo Default Login:
echo Email: admin@vtria.com
echo Password: VtriaAdmin@2024
echo.
echo ========================================
echo  Useful Commands
echo ========================================
echo.
echo View logs:        docker-compose -f docker-compose.windows.yml logs -f
echo Stop services:    docker-compose -f docker-compose.windows.yml down
echo Restart services: docker-compose -f docker-compose.windows.yml restart
echo.
echo Press any key to exit...
pause >nul