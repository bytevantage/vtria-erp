@echo off
echo Starting VTRIA ERP Server with output logging on port 5000...
set PORT=5000
node server\src\server.js > server_output.log 2>&1
echo Server output is being logged to server_output.log
