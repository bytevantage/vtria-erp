@echo off
echo Starting VTRIA ERP Node.js Server in debug mode...
echo Server logs will appear below:
echo =======================================
cd server
node src/server.js
echo =======================================
echo Server stopped or crashed. Check logs above.
pause
