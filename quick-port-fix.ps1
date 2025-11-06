# Quick Port Fix for VTRIA ERP
# Run this on the remote Windows Server to quickly resolve common port conflicts

Write-Host "Quick Port Fix for VTRIA ERP" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Please run this script as Administrator." -ForegroundColor Red
    Exit 1
}

Write-Host "`nStopping common conflicting services..." -ForegroundColor Yellow

# 1. Stop IIS (uses port 80)
try {
    $iisService = Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue
    if ($iisService -and $iisService.Status -eq "Running") {
        Write-Host "Stopping IIS..." -ForegroundColor Yellow
        Stop-Service -Name "W3SVC" -Force
        Write-Host "✅ IIS stopped" -ForegroundColor Green
    } else {
        Write-Host "IIS not running" -ForegroundColor Gray
    }
} catch {
    Write-Host "IIS not found" -ForegroundColor Gray
}

# 2. Stop MySQL service (uses port 3306)
try {
    $mysqlServices = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
    foreach ($service in $mysqlServices) {
        if ($service.Status -eq "Running") {
            Write-Host "Stopping MySQL service ($($service.Name))..." -ForegroundColor Yellow
            Stop-Service -Name $service.Name -Force
            Write-Host "✅ MySQL stopped" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "MySQL service not found" -ForegroundColor Gray
}

# 3. Stop World Wide Web Publishing Service
try {
    $wwwService = Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue
    if ($wwwService -and $wwwService.Status -eq "Running") {
        Write-Host "Stopping World Wide Web Publishing Service..." -ForegroundColor Yellow
        Stop-Service -Name "W3SVC" -Force
        Write-Host "✅ WWW Service stopped" -ForegroundColor Green
    }
} catch {
    Write-Host "WWW Service not found" -ForegroundColor Gray
}

# 4. Stop any existing Docker containers
try {
    Write-Host "Stopping existing Docker containers..." -ForegroundColor Yellow
    Set-Location "C:\vtria-erp"
    docker-compose down -v
    docker system prune -f
    Write-Host "✅ Docker containers stopped" -ForegroundColor Green
} catch {
    Write-Host "Docker command failed. Make sure Docker is running." -ForegroundColor Red
}

Write-Host "`nChecking ports..." -ForegroundColor Yellow

$ports = @(80, 3001, 3306, 6379)
$allClear = $true

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($connection) {
        Write-Host "❌ Port $port still in use" -ForegroundColor Red
        $allClear = $false
    } else {
        Write-Host "✅ Port $port is free" -ForegroundColor Green
    }
}

if ($allClear) {
    Write-Host "`n🎉 All ports are now free!" -ForegroundColor Green
    Write-Host "You can now run: docker-compose up -d" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  Some ports are still in use." -ForegroundColor Yellow
    Write-Host "You may need to:" -ForegroundColor White
    Write-Host "1. Reboot the server" -ForegroundColor White
    Write-Host "2. Use Task Manager to kill processes using these ports" -ForegroundColor White
    Write-Host "3. Modify docker-compose.yml to use different ports" -ForegroundColor White
}

Write-Host "`nDone!" -ForegroundColor Cyan
