@echo off
REM VTRIA ERP Windows Deployment Fix Script

echo ========================================
echo VTRIA ERP Windows Deployment Fix
echo ========================================

echo Step 1: Stopping existing containers...
docker-compose -f docker-compose.windows.yml down 2>NUL

echo Step 2: Removing problematic volumes...
docker volume rm vtria-erp_mysql_data 2>NUL

echo Step 3: Cleaning up images...
docker system prune -f

echo Step 4: Creating necessary directories...
if not exist "sql\schema" mkdir "sql\schema"
if not exist "logs" mkdir "logs"
if not exist "uploads" mkdir "uploads"

echo Step 5: Starting with fixed configuration...
docker-compose -f docker-compose.windows-fixed.yml up -d

echo Step 6: Monitoring startup progress...
timeout /t 30 /nobreak >nul

echo Step 7: Checking container status...
docker ps --filter "name=vtria-erp"

echo.
echo Step 8: Testing database connection...
timeout /t 10 /nobreak >nul
docker exec vtria-erp-db-1 mysqladmin ping -u root -pSecureRootPassword123! 2>NUL
if %errorlevel% == 0 (
    echo ✓ Database is healthy!
) else (
    echo ✗ Database needs more time to initialize
    echo Waiting additional 30 seconds...
    timeout /t 30 /nobreak >nul
)

echo.
echo Step 9: Final status check...
docker-compose -f docker-compose.windows-fixed.yml ps

echo.
echo ========================================
echo DEPLOYMENT COMPLETED!
echo ========================================
echo Frontend: http://localhost:3000
echo API: http://localhost:5000
echo Database: localhost:3306
echo.
echo Login Credentials:
echo   Admin: admin@vtria.com / Admin123!
echo   Director: director@vtria.com / VtriaDir2025!
echo   Manager: manager@vtria.com / Manager2025!
echo ========================================

pause