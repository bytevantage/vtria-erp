@echo off
echo Killing any process using port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Found process: %%a
    taskkill /F /PID %%a
    echo Process %%a killed
)
echo Done
