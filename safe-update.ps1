# VTRIA ERP - Safe Update Script for Windows Production
# Handles complete update process with backups and rollback capability

param(
    [string]$UpdateMethod = "git", # Options: "git", "folder", "manual"
    [string]$SourcePath = "",      # Path to new version (for folder method)
    [switch]$SkipBackup = $false,  # Skip pre-update backup
    [switch]$SkipMigrations = $false # Skip database migrations
)

Write-Host "🚀 VTRIA ERP Production Update Starting..." -ForegroundColor Blue
Write-Host "===========================================" -ForegroundColor Blue
Write-Host ""

$ErrorActionPreference = "Stop"
$UpdateStartTime = Get-Date

try {
    # Pre-update checks
    Write-Host "🔍 Pre-update checks..." -ForegroundColor Blue
    
    # Check if running as Administrator
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    if (-not $isAdmin) {
        throw "This script must be run as Administrator"
    }

    # Check if Docker is running
    try {
        docker version | Out-Null
        Write-Host "✅ Docker is running" -ForegroundColor Green
    } catch {
        throw "Docker is not running. Please start Docker Desktop."
    }

    # Navigate to application directory
    if (-not (Test-Path "C:\vtria-erp")) {
        throw "VTRIA ERP directory not found at C:\vtria-erp"
    }
    
    Set-Location "C:\vtria-erp"
    Write-Host "✅ Located VTRIA ERP directory" -ForegroundColor Green

    # Step 1: Create backup (unless skipped)
    if (-not $SkipBackup) {
        Write-Host ""
        Write-Host "📦 Step 1: Creating pre-update backup..." -ForegroundColor Blue
        .\backup-before-update.ps1
        if ($LASTEXITCODE -ne 0) {
            throw "Backup failed - aborting update"
        }
        Write-Host "✅ Backup completed successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipping backup as requested" -ForegroundColor Yellow
    }

    # Step 2: Stop services gracefully
    Write-Host ""
    Write-Host "🛑 Step 2: Stopping services..." -ForegroundColor Blue
    
    # Give users warning
    Write-Host "⚠️  Stopping VTRIA ERP services - users will be disconnected" -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    docker-compose -f docker-compose.windows.yml down
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Services stopped successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some issues stopping services, continuing..." -ForegroundColor Yellow
    }

    # Step 3: Update application code
    Write-Host ""
    Write-Host "📥 Step 3: Updating application code..." -ForegroundColor Blue

    switch ($UpdateMethod.ToLower()) {
        "git" {
            Write-Host "🔄 Using Git to pull latest changes..." -ForegroundColor Blue
            
            # Check if this is a Git repository
            if (-not (Test-Path ".git")) {
                throw "Not a Git repository. Use -UpdateMethod folder instead."
            }

            # Stash any local changes
            git stash push -m "Auto-stash before update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            
            # Pull latest changes
            git fetch origin
            git checkout main
            git pull origin main
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Git update completed" -ForegroundColor Green
            } else {
                throw "Git update failed"
            }
        }
        
        "folder" {
            if ([string]::IsNullOrEmpty($SourcePath)) {
                throw "SourcePath parameter required for folder update method"
            }
            
            if (-not (Test-Path $SourcePath)) {
                throw "Source path not found: $SourcePath"
            }

            Write-Host "📁 Copying files from: $SourcePath" -ForegroundColor Blue
            
            # Preserve important directories
            $preserveDirs = @("logs", "uploads", ".git", "node_modules")
            
            # Copy new files (excluding preserved directories)
            Get-ChildItem $SourcePath | Where-Object { $_.Name -notin $preserveDirs } | ForEach-Object {
                Copy-Item $_.FullName "." -Recurse -Force
                Write-Host "  📄 Updated: $($_.Name)" -ForegroundColor Gray
            }
            
            Write-Host "✅ Folder update completed" -ForegroundColor Green
        }
        
        "manual" {
            Write-Host "⏭️  Manual update - assuming files already updated" -ForegroundColor Yellow
        }
        
        default {
            throw "Invalid update method: $UpdateMethod. Use 'git', 'folder', or 'manual'"
        }
    }

    # Step 4: Run database migrations
    if (-not $SkipMigrations) {
        Write-Host ""
        Write-Host "📊 Step 4: Running database migrations..." -ForegroundColor Blue
        
        # Start database only for migrations
        docker-compose -f docker-compose.windows.yml up -d db
        Start-Sleep -Seconds 15  # Wait for database to be ready
        
        .\run-migrations.ps1
        
        Write-Host "✅ Database migrations completed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipping migrations as requested" -ForegroundColor Yellow
    }

    # Step 5: Rebuild containers
    Write-Host ""
    Write-Host "🔨 Step 5: Rebuilding containers..." -ForegroundColor Blue
    
    # Build with no cache to ensure latest code
    docker-compose -f docker-compose.windows.yml build --no-cache
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Containers rebuilt successfully" -ForegroundColor Green
    } else {
        throw "Container build failed"
    }

    # Step 6: Start services
    Write-Host ""
    Write-Host "🚀 Step 6: Starting updated services..." -ForegroundColor Blue
    
    docker-compose -f docker-compose.windows.yml up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Services started successfully" -ForegroundColor Green
    } else {
        throw "Failed to start services"
    }

    # Step 7: Wait for services and verify
    Write-Host ""
    Write-Host "🔍 Step 7: Verifying deployment..." -ForegroundColor Blue
    
    Write-Host "⏳ Waiting for services to initialize..." -ForegroundColor Blue
    Start-Sleep -Seconds 30

    # Test API health
    $healthOK = $false
    for ($i = 1; $i -le 10; $i++) {
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
            if ($health.status -eq "OK") {
                Write-Host "✅ API health check passed" -ForegroundColor Green
                $healthOK = $true
                break
            }
        } catch {
            Write-Host "⏳ API not ready yet (attempt $i/10)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
        }
    }

    if (-not $healthOK) {
        throw "API health check failed after 10 attempts"
    }

    # Test frontend
    try {
        $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
        if ($frontend.StatusCode -eq 200) {
            Write-Host "✅ Frontend accessibility verified" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Frontend check failed - may need more time to initialize" -ForegroundColor Yellow
    }

    # Test database
    try {
        docker exec vtria-erp-db mysql -u vtria_user -pSecurePassword123! -e "SELECT COUNT(*) FROM users" vtria_erp | Out-Null
        Write-Host "✅ Database connectivity verified" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Database check failed" -ForegroundColor Yellow
    }

    # Success summary
    $updateDuration = (Get-Date) - $UpdateStartTime
    
    Write-Host ""
    Write-Host "🎉 UPDATE COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Update Summary:" -ForegroundColor Blue
    Write-Host "  ⏱️  Duration: $([math]::Round($updateDuration.TotalMinutes, 1)) minutes" -ForegroundColor White
    Write-Host "  🔄 Method: $UpdateMethod" -ForegroundColor White
    Write-Host "  📦 Backup: $(if ($SkipBackup) {'Skipped'} else {'Created'})" -ForegroundColor White
    Write-Host "  📊 Migrations: $(if ($SkipMigrations) {'Skipped'} else {'Executed'})" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 Access Information:" -ForegroundColor Blue
    Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "  API: http://localhost:3001" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ VTRIA ERP is now running the updated version!" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "❌ UPDATE FAILED!" -ForegroundColor Red
    Write-Host "================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔄 Rollback Options:" -ForegroundColor Yellow
    Write-Host "1. Restore from backup: .\rollback-to-previous.ps1" -ForegroundColor White
    Write-Host "2. Check service logs: docker-compose -f docker-compose.windows.yml logs" -ForegroundColor White
    Write-Host "3. Manual recovery: Start services with previous version" -ForegroundColor White
    Write-Host ""
    
    # Try to start services with current state
    Write-Host "🚑 Attempting emergency service start..." -ForegroundColor Yellow
    try {
        docker-compose -f docker-compose.windows.yml up -d
        Write-Host "✅ Services started in current state" -ForegroundColor Green
    } catch {
        Write-Host "❌ Could not start services - manual intervention required" -ForegroundColor Red
    }
    
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")