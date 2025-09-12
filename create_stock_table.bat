@echo off
setlocal enabledelayedexpansion

echo VTRIA ERP Database - Creating Stock Table
echo =========================================

REM Find MySQL path from WAMP installation
set MYSQL_PATH=
for /d %%i in (C:\wamp64\bin\mysql\mysql*) do (
    set MYSQL_PATH=%%i\bin
)

if not defined MYSQL_PATH (
    echo MySQL installation not found in WAMP directory.
    echo Please make sure WAMP is installed correctly.
    exit /b 1
)

echo Found MySQL at: %MYSQL_PATH%

REM Database credentials
set DB_USER=root
set DB_PASS=
set DB_NAME=vtria_erp_dev
set DB_HOST=localhost

echo Creating stock table in %DB_NAME% database...

REM Run the SQL script
"%MYSQL_PATH%\mysql" -h %DB_HOST% -u %DB_USER% %DB_NAME% < create_stock_table.sql

if %ERRORLEVEL% neq 0 (
    echo Error creating stock table. Please check the SQL script for errors.
    exit /b 1
)

echo Stock table created successfully!
echo.
echo You can now verify the database setup by running:
echo php check_database.php
echo.

pause
