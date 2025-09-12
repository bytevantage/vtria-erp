@echo off
echo ===================================================
echo  VTRIA ERP Server Starter with Output
echo ===================================================
echo Server directory: %~dp0server
cd server
echo Starting Node.js server...
echo Default admin credentials: admin@vtria.com / VtriaAdmin@2024
echo Server will be available at: http://localhost:3000
echo Frontend will be available at: http://localhost:8080/vtria-erp/
echo ===================================================
echo.
node src/server.js
pause
