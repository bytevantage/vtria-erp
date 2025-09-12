@echo off
echo Starting VTRIA ERP Node.js Server...
cd /d C:\wamp64\www\vtria-erp\server
echo Current directory: %CD%
echo.
echo Server starting on http://localhost:3000
echo.
node src\server.js
pause
