@echo off
echo Starting VTRIA ERP Server on port 5000...
set PORT=5000
node server\src\server.js > server_port_5000.log 2>&1
echo Server started on port 5000. Check server_port_5000.log for details.
