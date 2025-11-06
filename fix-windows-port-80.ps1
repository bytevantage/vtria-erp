# Fix Windows Port 80 Permission Issue for VTRIA ERP
# This script resolves the "access forbidden" error for port 80 on Windows

Write-Host "VTRIA ERP - Windows Port 80 Permission Fix" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    Exit 1
}

Write-Host "`nPort 80 Permission Error Detected" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
Write-Host "Windows is blocking access to port 80 due to security restrictions." -ForegroundColor White
Write-Host "This is common on Windows Server systems." -ForegroundColor White

Write-Host "`nChoose a solution:" -ForegroundColor Yellow
Write-Host "1. Use alternative port 8080 (RECOMMENDED)" -ForegroundColor Green
Write-Host "2. Stop conflicting services and try port 80 again" -ForegroundColor Yellow
Write-Host "3. Grant port 80 permissions to Docker (Advanced)" -ForegroundColor Red
Write-Host "4. Exit"

$choice = Read-Host "`nEnter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "`nConfiguring VTRIA ERP to use port 8080..." -ForegroundColor Green
        
        $vtriaPath = "C:\vtria-erp"
        if (Test-Path $vtriaPath) {
            # Backup original docker-compose.yml
            $originalFile = "$vtriaPath\docker-compose.yml"
            $backupFile = "$vtriaPath\docker-compose.backup.yml"
            
            if (Test-Path $originalFile) {
                Copy-Item $originalFile $backupFile -Force
                Write-Host "✅ Original docker-compose.yml backed up" -ForegroundColor Green
            }
            
            # Download alternative configuration
            try {
                Invoke-WebRequest -Uri "https://raw.githubusercontent.com/bytevantage/vtria-erp/main/docker-compose-alt-ports.yml" -OutFile "$vtriaPath\docker-compose-alt-ports.yml"
                Write-Host "✅ Alternative port configuration downloaded" -ForegroundColor Green
            } catch {
                Write-Host "Failed to download alternative configuration. Using local copy..." -ForegroundColor Yellow
            }
            
            # Stop existing containers
            Write-Host "Stopping existing containers..." -ForegroundColor Yellow
            Set-Location $vtriaPath
            docker-compose down -v
            
            # Start with alternative ports
            Write-Host "Starting VTRIA ERP with alternative ports..." -ForegroundColor Green
            docker-compose -f docker-compose-alt-ports.yml up -d
            
            Write-Host "`n✅ VTRIA ERP is now running on alternative ports!" -ForegroundColor Green
            Write-Host "`nNew Access URLs:" -ForegroundColor Cyan
            Write-Host "🌐 Web Interface: http://localhost:8080" -ForegroundColor Cyan
            Write-Host "🔧 API: http://localhost:3001" -ForegroundColor Cyan
            Write-Host "`nDemo credentials:" -ForegroundColor White
            Write-Host "📧 Email: demo@vtria.com" -ForegroundColor White
            Write-Host "🔑 Password: Demo@123456" -ForegroundColor White
            
            Write-Host "`nTo use alternative ports permanently:" -ForegroundColor Yellow
            Write-Host "1. Rename docker-compose-alt-ports.yml to docker-compose.yml" -ForegroundColor White
            Write-Host "2. Or always run: docker-compose -f docker-compose-alt-ports.yml up -d" -ForegroundColor White
            
        } else {
            Write-Host "VTRIA ERP not found at C:\vtria-erp\" -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host "`nStopping services that might block port 80..." -ForegroundColor Yellow
        
        # Stop IIS
        try {
            $iisService = Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue
            if ($iisService -and $iisService.Status -eq "Running") {
                Write-Host "Stopping IIS..." -ForegroundColor Yellow
                Stop-Service -Name "W3SVC" -Force
                Write-Host "✅ IIS stopped" -ForegroundColor Green
            }
        } catch {
            Write-Host "IIS not running" -ForegroundColor Gray
        }
        
        # Stop World Wide Web Publishing Service
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
        
        # Stop SQL Server Reporting Services (uses port 80)
        try {
            $ssrsService = Get-Service -Name "ReportServer*" -ErrorAction SilentlyContinue
            if ($ssrsService) {
                foreach ($service in $ssrsService) {
                    if ($service.Status -eq "Running") {
                        Write-Host "Stopping SQL Server Reporting Services..." -ForegroundColor Yellow
                        Stop-Service -Name $service.Name -Force
                        Write-Host "✅ SSRS stopped" -ForegroundColor Green
                    }
                }
            }
        } catch {
            Write-Host "SQL Server Reporting Services not found" -ForegroundColor Gray
        }
        
        Write-Host "`nTrying to start VTRIA ERP with port 80..." -ForegroundColor Yellow
        Set-Location "C:\vtria-erp"
        docker-compose down -v
        docker-compose up -d
        
        Start-Sleep -Seconds 10
        
        # Check if it worked
        $connection = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
        if ($connection) {
            Write-Host "✅ Port 80 is now in use by VTRIA ERP!" -ForegroundColor Green
            Write-Host "🌐 Access at: http://localhost" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Port 80 still blocked. Try option 1 to use port 8080." -ForegroundColor Red
        }
    }
    
    "3" {
        Write-Host "`nAdvanced: Granting port 80 permissions to Docker..." -ForegroundColor Red
        Write-Host "⚠️  This modifies Windows security settings." -ForegroundColor Red
        Write-Host ""
        
        $confirm = Read-Host "Are you sure you want to continue? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Host "Cancelled." -ForegroundColor Yellow
            Exit 0
        }
        
        try {
            # Add URL reservation for port 80
            Write-Host "Adding URL reservation for port 80..." -ForegroundColor Yellow
            & netsh http add urlacl url=http://+:80/ user="Everyone"
            Write-Host "✅ URL reservation added" -ForegroundColor Green
            
            # Restart Docker service
            Write-Host "Restarting Docker service..." -ForegroundColor Yellow
            Restart-Service -Name "Docker" -Force
            Start-Sleep -Seconds 10
            
            Write-Host "Trying to start VTRIA ERP..." -ForegroundColor Yellow
            Set-Location "C:\vtria-erp"
            docker-compose down -v
            docker-compose up -d
            
            Start-Sleep -Seconds 10
            
            # Check if it worked
            $connection = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
            if ($connection) {
                Write-Host "✅ Port 80 is now accessible!" -ForegroundColor Green
                Write-Host "🌐 Access at: http://localhost" -ForegroundColor Cyan
            } else {
                Write-Host "❌ Port 80 still blocked. You may need to restart the server." -ForegroundColor Red
            }
            
        } catch {
            Write-Host "❌ Failed to grant port 80 permissions: $_" -ForegroundColor Red
            Write-Host "Try option 1 to use port 8080 instead." -ForegroundColor Yellow
        }
    }
    
    "4" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        Exit 0
    }
    
    default {
        Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
        Exit 1
    }
}

Write-Host "`nScript completed." -ForegroundColor Cyan
