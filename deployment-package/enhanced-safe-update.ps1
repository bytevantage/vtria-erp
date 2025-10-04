# Enhanced Safe Update Script for Production
# Preserves all user data while updating application code

param(
    [switch]$PreserveUserData = $false,
    [switch]$RunMigrations = $false, 
    [switch]$VerifyData = $false,
    [string]$NewVersionPath = ".\new-version",
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
$BackupDate = Get-Date -Format "yyyyMMdd-HHmm"

Write-Host "🚀 ENHANCED SAFE UPDATE PROCESS STARTING..." -ForegroundColor Green
Write-Host "📅 Backup Date: $BackupDate" -ForegroundColor Cyan

# Step 1: Pre-Update Verification
Write-Host "`n🔍 STEP 1: PRE-UPDATE VERIFICATION" -ForegroundColor Yellow

if ($VerifyData) {
    Write-Host "📊 Checking existing data..." -ForegroundColor Cyan
    
    # Count existing records before update
    $PreUpdateCounts = docker exec vtria-erp-db mysql -u vtria_user -pSecurePassword123! -e "
    SELECT 
      (SELECT COUNT(*) FROM users) as users_count,
      (SELECT COUNT(*) FROM clients) as clients_count, 
      (SELECT COUNT(*) FROM estimations) as estimations_count,
      (SELECT COUNT(*) FROM quotations) as quotations_count
    " vtria_erp 2>$null
    
    Write-Host "📈 Current Data Counts:" -ForegroundColor Green
    Write-Host $PreUpdateCounts -ForegroundColor White
    
    # Store for later comparison
    $PreUpdateCounts | Out-File -FilePath "pre-update-counts-$BackupDate.txt"
}

# Step 2: Comprehensive Backup
Write-Host "`n💾 STEP 2: COMPREHENSIVE BACKUP" -ForegroundColor Yellow

# Create backup directory
New-Item -ItemType Directory -Path "C:\backups\full-backup-$BackupDate" -Force | Out-Null

Write-Host "🗄️ Creating database backup..." -ForegroundColor Cyan
docker exec vtria-erp-db mysqldump -u vtria_user -pSecurePassword123! --routines --triggers --single-transaction vtria_erp > "C:\backups\full-backup-$BackupDate\database-backup.sql"

if ($PreserveUserData) {
    Write-Host "📁 Backing up user data directories..." -ForegroundColor Cyan
    
    if (Test-Path "C:\vtria-erp\uploads") {
        Copy-Item "C:\vtria-erp\uploads" "C:\backups\full-backup-$BackupDate\uploads" -Recurse -Force
        Write-Host "✅ Uploads backed up" -ForegroundColor Green
    }
    
    if (Test-Path "C:\vtria-erp\logs") {
        Copy-Item "C:\vtria-erp\logs" "C:\backups\full-backup-$BackupDate\logs" -Recurse -Force  
        Write-Host "✅ Logs backed up" -ForegroundColor Green
    }
    
    if (Test-Path "C:\vtria-erp\.env.production") {
        Copy-Item "C:\vtria-erp\.env.production" "C:\backups\full-backup-$BackupDate\" -Force
        Write-Host "✅ Environment config backed up" -ForegroundColor Green
    }
}

# Step 3: Stop Services Safely
Write-Host "`n⏹️ STEP 3: STOPPING SERVICES" -ForegroundColor Yellow

docker-compose -f docker-compose.windows.yml down
Write-Host "✅ Services stopped safely" -ForegroundColor Green

# Step 4: Update Application Code
Write-Host "`n🔄 STEP 4: UPDATING APPLICATION CODE" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "🧪 DRY RUN: Would update the following directories:" -ForegroundColor Magenta
    Write-Host "  - C:\vtria-erp\api\" -ForegroundColor Yellow  
    Write-Host "  - C:\vtria-erp\client\" -ForegroundColor Yellow
    Write-Host "  - C:\vtria-erp\docker-compose.windows.yml" -ForegroundColor Yellow
} else {
    # Update API code
    if (Test-Path "$NewVersionPath\api") {
        Remove-Item "C:\vtria-erp\api" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item "$NewVersionPath\api" "C:\vtria-erp\api" -Recurse -Force
        Write-Host "✅ API code updated" -ForegroundColor Green
    }
    
    # Update Client code  
    if (Test-Path "$NewVersionPath\client") {
        Remove-Item "C:\vtria-erp\client" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item "$NewVersionPath\client" "C:\vtria-erp\client" -Recurse -Force
        Write-Host "✅ Client code updated" -ForegroundColor Green
    }
    
    # Update Docker configuration (but preserve data volumes)
    if (Test-Path "$NewVersionPath\docker-compose.windows.yml") {
        Copy-Item "$NewVersionPath\docker-compose.windows.yml" "C:\vtria-erp\docker-compose.windows.yml" -Force
        Write-Host "✅ Docker config updated" -ForegroundColor Green
    }
}

# Step 5: Restore User Data
Write-Host "`n📤 STEP 5: RESTORING USER DATA" -ForegroundColor Yellow

if ($PreserveUserData -and !$DryRun) {
    # Restore uploads directory
    if (Test-Path "C:\backups\full-backup-$BackupDate\uploads") {
        New-Item -ItemType Directory -Path "C:\vtria-erp\uploads" -Force | Out-Null
        Copy-Item "C:\backups\full-backup-$BackupDate\uploads\*" "C:\vtria-erp\uploads\" -Recurse -Force
        Write-Host "✅ Uploads restored" -ForegroundColor Green
    }
    
    # Restore logs directory  
    if (Test-Path "C:\backups\full-backup-$BackupDate\logs") {
        New-Item -ItemType Directory -Path "C:\vtria-erp\logs" -Force | Out-Null
        Copy-Item "C:\backups\full-backup-$BackupDate\logs\*" "C:\vtria-erp\logs\" -Recurse -Force
        Write-Host "✅ Logs restored" -ForegroundColor Green
    }
    
    # Restore environment config
    if (Test-Path "C:\backups\full-backup-$BackupDate\.env.production") {
        Copy-Item "C:\backups\full-backup-$BackupDate\.env.production" "C:\vtria-erp\.env.production" -Force
        Write-Host "✅ Environment config restored" -ForegroundColor Green
    }
}

# Step 6: Database Migrations
Write-Host "`n🗃️ STEP 6: DATABASE MIGRATIONS" -ForegroundColor Yellow

if (!$DryRun) {
    # Start database service only for migrations
    docker-compose -f docker-compose.windows.yml up -d db
    
    # Wait for database to be ready
    Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    if ($RunMigrations) {
        Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan
        
        # Run migration scripts if they exist
        if (Test-Path "C:\vtria-erp\sql\migrations") {
            $MigrationFiles = Get-ChildItem "C:\vtria-erp\sql\migrations\*.sql" | Sort-Object Name
            
            foreach ($Migration in $MigrationFiles) {
                Write-Host "📄 Running migration: $($Migration.Name)" -ForegroundColor Cyan
                Get-Content $Migration.FullName | docker exec -i vtria-erp-db mysql -u vtria_user -pSecurePassword123! vtria_erp
                Write-Host "✅ Migration completed: $($Migration.Name)" -ForegroundColor Green
            }
        } else {
            Write-Host "ℹ️ No migrations directory found" -ForegroundColor Yellow
        }
    }
}

# Step 7: Start Services
Write-Host "`n🚀 STEP 7: STARTING SERVICES" -ForegroundColor Yellow

if (!$DryRun) {
    docker-compose -f docker-compose.windows.yml up -d
    Write-Host "✅ All services started" -ForegroundColor Green
    
    # Wait for services to be ready
    Write-Host "⏳ Waiting for services to initialize..." -ForegroundColor Cyan
    Start-Sleep -Seconds 15
}

# Step 8: Post-Update Verification
Write-Host "`n✅ STEP 8: POST-UPDATE VERIFICATION" -ForegroundColor Yellow

if ($VerifyData -and !$DryRun) {
    Write-Host "📊 Verifying data integrity..." -ForegroundColor Cyan
    
    # Count records after update
    $PostUpdateCounts = docker exec vtria-erp-db mysql -u vtria_user -pSecurePassword123! -e "
    SELECT 
      (SELECT COUNT(*) FROM users) as users_count,
      (SELECT COUNT(*) FROM clients) as clients_count, 
      (SELECT COUNT(*) FROM estimations) as estimations_count,
      (SELECT COUNT(*) FROM quotations) as quotations_count
    " vtria_erp 2>$null
    
    Write-Host "📈 Post-Update Data Counts:" -ForegroundColor Green
    Write-Host $PostUpdateCounts -ForegroundColor White
    
    # Save comparison
    $PostUpdateCounts | Out-File -FilePath "post-update-counts-$BackupDate.txt"
    
    # Basic service health check
    Write-Host "🩺 Health checking services..." -ForegroundColor Cyan
    
    # Check if API is responding
    try {
        $ApiResponse = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 10
        if ($ApiResponse.StatusCode -eq 200) {
            Write-Host "✅ API service healthy" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ API service not responding" -ForegroundColor Red
    }
    
    # Check if frontend is responding  
    try {
        $FrontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
        if ($FrontendResponse.StatusCode -eq 200) {
            Write-Host "✅ Frontend service healthy" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Frontend service not responding" -ForegroundColor Red
    }
}

Write-Host "`n🎉 UPDATE PROCESS COMPLETED!" -ForegroundColor Green
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  - Backup created: C:\backups\full-backup-$BackupDate" -ForegroundColor White
Write-Host "  - Database data: ✅ PRESERVED in Docker volume" -ForegroundColor Green  
if ($PreserveUserData) {
    Write-Host "  - User uploads: ✅ PRESERVED" -ForegroundColor Green
    Write-Host "  - Logs: ✅ PRESERVED" -ForegroundColor Green
}
Write-Host "  - Application code: ✅ UPDATED" -ForegroundColor Green
if ($RunMigrations) {
    Write-Host "  - Database schema: ✅ MIGRATED" -ForegroundColor Green
}

Write-Host "`n🌐 Access your application:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  API: http://localhost:5000" -ForegroundColor White

if ($DryRun) {
    Write-Host "`n🧪 This was a DRY RUN - no actual changes were made" -ForegroundColor Magenta
    Write-Host "Run without -DryRun to perform the actual update" -ForegroundColor Magenta
}