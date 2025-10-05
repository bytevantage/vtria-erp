@echo off
REM Windows Database Troubleshooting Script for VTRIA ERP

echo ========================================
echo VTRIA ERP Database Troubleshooting
echo ========================================

echo.
echo Step 1: Checking Docker containers...
docker ps -a --filter "name=vtria-erp"

echo.
echo Step 2: Checking container logs...
echo --- Database Container Logs ---
docker logs vtria-erp-db-1 --tail 50

echo.
echo --- API Container Logs ---
docker logs vtria-erp-api-1 --tail 20

echo.
echo Step 3: Checking container health...
docker inspect vtria-erp-db-1 --format="{{.State.Health.Status}}"

echo.
echo Step 4: Testing database connectivity...
docker exec -it vtria-erp-db-1 mysqladmin ping -u root -pSecureRootPassword123! 2>NUL
if %errorlevel% == 0 (
    echo Database is responding!
) else (
    echo Database is not responding
)

echo.
echo Step 5: Cleanup and restart (y/n)?
set /p restart="Do you want to cleanup and restart? (y/n): "
if /i "%restart%"=="y" (
    echo Stopping containers...
    docker-compose -f docker-compose.windows.yml down
    echo Removing volumes...
    docker volume rm vtria-erp_mysql_data 2>NUL
    echo Starting fresh deployment...
    docker-compose -f docker-compose.windows.yml up -d
    echo Deployment restarted!
) else (
    echo Troubleshooting completed.
)

pause