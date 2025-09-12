# VTRIA ERP Server Starter Script

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "        VTRIA ERP Node.js Server Starter" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "[INFO] Using Node.js version: $nodeVersion" -ForegroundColor Green
    $npmVersion = npm -v
    Write-Host "[INFO] Using NPM version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js and try again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Navigate to server directory
Write-Host "[INFO] Changing to server directory..." -ForegroundColor Yellow
try {
    Set-Location -Path "C:\wamp64\www\vtria-erp\server" -ErrorAction Stop
    Write-Host "[INFO] Current directory: $(Get-Location)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to change directory to server folder." -ForegroundColor Red
    Write-Host "Please make sure the path exists: C:\wamp64\www\vtria-erp\server" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "[WARNING] .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[INFO] Created .env file from .env.example" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] .env.example file not found. Cannot create .env file." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "[WARNING] node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    try {
        npm install
        Write-Host "[INFO] Dependencies installed successfully." -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to install dependencies." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
# Kill any existing processes on port 5000
Write-Host "[INFO] Checking for existing processes on port 5000..." -ForegroundColor Yellow
$existingProcesses = netstat -ano | Select-String ":5000" | Select-String "LISTENING"
if ($existingProcesses) {
    $existingProcesses | ForEach-Object {
        $processId = ($_ -split ' ')[-1]
        Write-Host "[INFO] Killing process with PID $processId on port 5000" -ForegroundColor Yellow
        taskkill /F /PID $processId
    }
}

# Set environment variables
$env:PORT = 5000
$env:NODE_ENV = "development"
$env:IGNORE_SIGINT = "true"

Write-Host "[INFO] Starting VTRIA ERP Node.js Server on port 5000..." -ForegroundColor Green
Write-Host "[INFO] Server will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "[INFO] Frontend will be available at: http://localhost:8080/vtria-erp/" -ForegroundColor Cyan
Write-Host "[INFO] Default admin credentials: admin@vtria.com / VtriaAdmin@2024" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan

# Create a job to start the server in the background
$job = Start-Job -ScriptBlock {
    param($serverPath)
    Set-Location $serverPath
    $env:PORT = 5000
    $env:NODE_ENV = "development"
    $env:IGNORE_SIGINT = "true"
    node src/server.js
} -ArgumentList (Get-Location)

Write-Host "[INFO] Server started in background job with ID: $($job.Id)" -ForegroundColor Green
Write-Host "[INFO] Server will continue running even if this window is closed" -ForegroundColor Green
Write-Host "[INFO] To stop the server, run: Stop-Job -Id $($job.Id); Remove-Job -Id $($job.Id)" -ForegroundColor Yellow

# Monitor the server status
Write-Host "\nMonitoring server status (press Ctrl+C to exit monitoring, server will continue running)..." -ForegroundColor Cyan

try {
    while ($true) {
        $jobState = (Get-Job -Id $job.Id).State
        Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Server status: $jobState" -ForegroundColor Green
        
        # Check if port 5000 is in use
        $portInUse = netstat -ano | Select-String ":5000" | Select-String "LISTENING"
        if ($portInUse) {
            Write-Host "[INFO] Port 5000 is active and listening" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Port 5000 is not in use - server may not be running correctly" -ForegroundColor Red
        }
        
        Start-Sleep -Seconds 10
    }
} catch {
    Write-Host "\n[INFO] Monitoring stopped, but server continues running in the background" -ForegroundColor Yellow
    Write-Host "[INFO] Server job ID: $($job.Id)" -ForegroundColor Cyan
    Write-Host "[INFO] To stop the server later, run: Stop-Job -Id $($job.Id); Remove-Job -Id $($job.Id)" -ForegroundColor Yellow
}
