@echo off
setlocal enabledelayedexpansion

echo VTRIA ERP Database - Creating Remaining Tables
echo =============================================

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

echo Creating remaining tables in %DB_NAME% database...

REM Run the SQL script
"%MYSQL_PATH%\mysql" -h %DB_HOST% -u %DB_USER% %DB_NAME% < create_remaining_tables.sql

if %ERRORLEVEL% neq 0 (
    echo Error creating tables. Please check the SQL script for errors.
    exit /b 1
)

echo Tables created successfully!
echo.
echo You can now verify the database setup by running:
echo php check_database.php
echo.

pause
