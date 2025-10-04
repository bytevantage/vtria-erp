@echo off
REM VTRIA ERP Windows Production Deployment
REM Run this batch file as Administrator to deploy VTRIA ERP

echo ==========================================
echo VTRIA ERP Windows Production Deployment
echo ==========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click on this file and select "Run as administrator"
    pause
    exit /b 1
)

echo Checking Docker installation...
docker --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ERROR: Docker is not installed or not running!
    echo Please install Docker Desktop for Windows first.
    pause
    exit /b 1
)

echo Docker found. Checking Docker Compose...
docker-compose --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ERROR: Docker Compose is not available!
    pause
    exit /b 1
)

echo Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "backups" mkdir backups

echo Stopping existing containers...
docker-compose -f docker-compose.windows.yml down

echo Building Docker images...
docker-compose -f docker-compose.windows.yml build

echo Starting production services...
docker-compose -f docker-compose.windows.yml up -d

echo Waiting for services to start...
timeout /t 30 /nobreak >nul

echo Testing API health...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host 'API is healthy' } else { Write-Host 'API health check failed' } } catch { Write-Host 'API not responding yet' }"

echo Testing Frontend...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host 'Frontend is accessible' } else { Write-Host 'Frontend check failed' } } catch { Write-Host 'Frontend not responding yet' }"

echo.
echo ==========================================
echo VTRIA ERP Deployment Complete!
echo ==========================================
echo.
echo Access Information:
echo   Frontend: http://localhost:3000
echo   API: http://localhost:3001
echo.
echo Default Admin Credentials:
echo   Email: admin@vtria.com
echo   Password: Admin123!
echo.
echo IMPORTANT:
echo 1. Change the default admin password after first login
echo 2. Set up Windows Firewall rules for ports 3000 and 3001
echo 3. Configure SSL/TLS certificates for production
echo 4. Set up automated backups
echo.
echo Management Commands:
echo   View logs: docker-compose -f docker-compose.windows.yml logs
echo   Stop: docker-compose -f docker-compose.windows.yml down
echo   Restart: docker-compose -f docker-compose.windows.yml restart
echo.
pause