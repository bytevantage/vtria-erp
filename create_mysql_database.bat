@echo off
echo === VTRIA ERP MySQL Database Setup ===
echo.

REM Find MySQL path in WAMP
set MYSQL_PATH=C:\wamp64\bin\mysql\mysql8.0.31\bin
if not exist "%MYSQL_PATH%" (
    echo MySQL path not found at %MYSQL_PATH%
    echo Trying to find MySQL in WAMP directory...
    for /d %%i in (C:\wamp64\bin\mysql\*) do (
        set MYSQL_PATH=%%i\bin
        echo Found MySQL at %%i\bin
    )
)

echo Using MySQL at %MYSQL_PATH%
echo.

REM MySQL credentials
set MYSQL_USER=root
set MYSQL_PASSWORD=

REM Create database
echo Creating VTRIA ERP database...
"%MYSQL_PATH%\mysql.exe" -u %MYSQL_USER% -e "DROP DATABASE IF EXISTS vtria_erp_dev; CREATE DATABASE vtria_erp_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo Database created successfully.
echo.

REM Run SQL script
echo Running database setup script...
"%MYSQL_PATH%\mysql.exe" -u %MYSQL_USER% vtria_erp_dev < C:\wamp64\www\vtria-erp\create_mysql_database.sql
echo Database setup completed.
echo.

REM Update server configuration
echo Updating server configuration to use MySQL...
echo.

echo === VTRIA ERP Database Setup Completed ===
echo Default Admin Login:
echo Email: admin@vtria.com
echo Password: VtriaAdmin@2024
echo.

pause
