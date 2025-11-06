# Fix Port Conflicts for VTRIA ERP on Windows Server
# Run this script on the remote Windows Server where VTRIA ERP is installed

Write-Host "VTRIA ERP Port Conflict Resolution Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    Exit 1
}

# Ports used by VTRIA ERP
$ports = @(
    @{Port=80; Service="Client (Web Server)"},
    @{Port=3001; Service="API Server"},
    @{Port=3306; Service="MySQL Database"},
    @{Port=6379; Service="Redis Cache"}
)

Write-Host "`nChecking port availability..." -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

$conflicts = @()

foreach ($portInfo in $ports) {
    $port = $portInfo.Port
    $service = $portInfo.Service
    
    # Check if port is in use
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    
    if ($connection) {
        Write-Host "❌ Port $port ($service): IN USE" -ForegroundColor Red
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "   Process: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Red
            Write-Host "   Path: $($process.Path)" -ForegroundColor Red
        }
        $conflicts += $portInfo
    } else {
        Write-Host "✅ Port $port ($service): Available" -ForegroundColor Green
    }
}

if ($conflicts.Count -gt 0) {
    Write-Host "`nPort conflicts detected!" -ForegroundColor Red
    Write-Host "========================" -ForegroundColor Red
    
    Write-Host "`nChoose an option to resolve conflicts:" -ForegroundColor Yellow
    Write-Host "1. Stop conflicting services (RECOMMENDED for clean VTRIA install)"
    Write-Host "2. Kill processes using the ports"
    Write-Host "3. Modify VTRIA to use different ports"
    Write-Host "4. Show current Docker containers"
    Write-Host "5. Exit"
    
    $choice = Read-Host "`nEnter your choice (1-5)"
    
    switch ($choice) {
        "1" {
            Write-Host "`nStopping potentially conflicting services..." -ForegroundColor Yellow
            
            # Stop IIS if running
            try {
                $iisService = Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue
                if ($iisService -and $iisService.Status -eq "Running") {
                    Write-Host "Stopping IIS (World Wide Web Publishing Service)..." -ForegroundColor Yellow
                    Stop-Service -Name "W3SVC" -Force
                    Write-Host "✅ IIS stopped" -ForegroundColor Green
                }
            } catch {
                Write-Host "IIS not running or not installed" -ForegroundColor Gray
            }
            
            # Stop MySQL service if running
            try {
                $mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
                if ($mysqlService -and $mysqlService.Status -eq "Running") {
                    Write-Host "Stopping MySQL service..." -ForegroundColor Yellow
                    Stop-Service -Name $mysqlService.Name -Force
                    Write-Host "✅ MySQL stopped" -ForegroundColor Green
                }
            } catch {
                Write-Host "MySQL service not running" -ForegroundColor Gray
            }
            
            # Stop any Docker containers
            try {
                Write-Host "Stopping existing Docker containers..." -ForegroundColor Yellow
                docker-compose down -v
                docker system prune -f
                Write-Host "✅ Docker containers stopped" -ForegroundColor Green
            } catch {
                Write-Host "Docker command failed. Make sure Docker is running." -ForegroundColor Red
            }
        }
        
        "2" {
            Write-Host "`nKilling processes using conflicting ports..." -ForegroundColor Yellow
            foreach ($portInfo in $conflicts) {
                $port = $portInfo.Port
                $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
                foreach ($conn in $connections) {
                    try {
                        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                        if ($process) {
                            Write-Host "Killing $($process.ProcessName) (PID: $($process.Id)) using port $port..." -ForegroundColor Yellow
                            Stop-Process -Id $conn.OwningProcess -Force
                            Write-Host "✅ Process killed" -ForegroundColor Green
                        }
                    } catch {
                        Write-Host "Failed to kill process on port $port" -ForegroundColor Red
                    }
                }
            }
        }
        
        "3" {
            Write-Host "`nCreating alternative docker-compose configuration..." -ForegroundColor Yellow
            
            $newPorts = @{
                80 = 8080
                3001 = 3002
                3306 = 3307
                6379 = 6380
            }
            
            $dockerComposePath = "C:\vtria-erp\docker-compose.yml"
            if (Test-Path $dockerComposePath) {
                $backupPath = "C:\vtria-erp\docker-compose.backup.yml"
                Copy-Item $dockerComposePath $backupPath
                Write-Host "✅ Original docker-compose.yml backed up" -ForegroundColor Green
                
                # Read and modify the docker-compose file
                $content = Get-Content $dockerComposePath -Raw
                foreach ($originalPort in $newPorts.Keys) {
                    $newPort = $newPorts[$originalPort]
                    $content = $content -replace "`"$originalPort`:$originalPort`"", "`"$newPort`:$originalPort`""
                }
                
                Set-Content $dockerComposePath -Value $content
                Write-Host "✅ docker-compose.yml updated with new ports:" -ForegroundColor Green
                foreach ($originalPort in $newPorts.Keys) {
                    $newPort = $newPorts[$originalPort]
                    Write-Host "   Port $originalPort → $newPort" -ForegroundColor Cyan
                }
                
                Write-Host "`nNew access URLs:" -ForegroundColor Yellow
                Write-Host "   Web Interface: http://localhost:$($newPorts[80])" -ForegroundColor Cyan
                Write-Host "   API: http://localhost:$($newPorts[3001])" -ForegroundColor Cyan
            } else {
                Write-Host "docker-compose.yml not found at C:\vtria-erp\" -ForegroundColor Red
            }
        }
        
        "4" {
            Write-Host "`nCurrent Docker containers:" -ForegroundColor Yellow
            try {
                docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            } catch {
                Write-Host "Failed to get Docker containers. Make sure Docker is running." -ForegroundColor Red
            }
        }
        
        "5" {
            Write-Host "Exiting..." -ForegroundColor Yellow
            Exit 0
        }
        
        default {
            Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
            Exit 1
        }
    }
    
    Write-Host "`nRe-checking ports after resolution..." -ForegroundColor Yellow
    Write-Host "====================================" -ForegroundColor Yellow
    
    $remainingConflicts = @()
    foreach ($portInfo in $ports) {
        $port = $portInfo.Port
        $service = $portInfo.Service
        
        $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
        
        if ($connection) {
            Write-Host "❌ Port $port ($service): Still IN USE" -ForegroundColor Red
            $remainingConflicts += $portInfo
        } else {
            Write-Host "✅ Port $port ($service): Now Available" -ForegroundColor Green
        }
    }
    
    if ($remainingConflicts.Count -eq 0) {
        Write-Host "`n🎉 All port conflicts resolved!" -ForegroundColor Green
        Write-Host "You can now run: docker-compose up -d" -ForegroundColor Cyan
    } else {
        Write-Host "`n⚠️  Some port conflicts remain. You may need to:" -ForegroundColor Yellow
        Write-Host "1. Reboot the server" -ForegroundColor White
        Write-Host "2. Manually stop the conflicting services" -ForegroundColor White
        Write-Host "3. Use option 3 to modify VTRIA ports" -ForegroundColor White
    }
} else {
    Write-Host "`n✅ No port conflicts detected!" -ForegroundColor Green
    Write-Host "You can run: docker-compose up -d" -ForegroundColor Cyan
}

Write-Host "`nScript completed." -ForegroundColor Cyan
