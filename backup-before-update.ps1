# VTRIA ERP - Pre-Update Backup Script for Windows
# Run this before any updates to ensure data safety

param(
    [string]$BackupLocation = "C:\vtria-erp-backups"
)

Write-Host "🔄 VTRIA ERP Pre-Update Backup Starting..." -ForegroundColor Blue
Write-Host "=============================================" -ForegroundColor Blue
Write-Host ""

# Create timestamp for backup
$BackupDate = Get-Date -Format "yyyyMMdd-HHmm"
$BackupDir = Join-Path $BackupLocation "backup-$BackupDate"

try {
    # Create backup directory
    Write-Host "📁 Creating backup directory: $BackupDir" -ForegroundColor Green
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

    # Check if Docker containers are running
    Write-Host "🔍 Checking Docker containers..." -ForegroundColor Blue
    $containers = docker ps --format "table {{.Names}}" | Select-String "vtria-erp"
    
    if ($containers.Count -eq 0) {
        Write-Host "⚠️  Warning: VTRIA ERP containers not running. Starting them for backup..." -ForegroundColor Yellow
        docker-compose -f docker-compose.windows.yml up -d
        Start-Sleep -Seconds 30
    }

    # Backup database
    Write-Host "📊 Backing up MySQL database..." -ForegroundColor Green
    $dbBackupFile = Join-Path $BackupDir "database-backup.sql"
    
    $dbBackupCmd = "docker exec vtria-erp-db mysqldump -u vtria_user -pSecurePassword123! --routines --triggers --single-transaction vtria_erp"
    Invoke-Expression $dbBackupCmd | Out-File -FilePath $dbBackupFile -Encoding UTF8
    
    if (Test-Path $dbBackupFile) {
        $dbSize = (Get-Item $dbBackupFile).Length / 1MB
        Write-Host "  ✅ Database backup completed: $([math]::Round($dbSize, 2)) MB" -ForegroundColor Green
    } else {
        throw "Database backup failed - file not created"
    }

    # Backup uploads directory
    Write-Host "📁 Backing up uploads directory..." -ForegroundColor Green
    $uploadsSource = "C:\vtria-erp\uploads"
    $uploadsBackup = Join-Path $BackupDir "uploads"
    
    if (Test-Path $uploadsSource) {
        Copy-Item $uploadsSource $uploadsBackup -Recurse -Force
        $uploadCount = (Get-ChildItem $uploadsBackup -Recurse -File).Count
        Write-Host "  ✅ Uploads backup completed: $uploadCount files" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  No uploads directory found" -ForegroundColor Yellow
    }

    # Backup configuration files
    Write-Host "⚙️  Backing up configuration files..." -ForegroundColor Green
    $configFiles = @(
        "docker-compose.windows.yml",
        ".env.production", 
        ".env.windows",
        "VERSION"
    )
    
    foreach ($configFile in $configFiles) {
        $sourcePath = Join-Path "C:\vtria-erp" $configFile
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath (Join-Path $BackupDir $configFile) -Force
            Write-Host "  ✅ Backed up: $configFile" -ForegroundColor Gray
        }
    }

    # Backup logs (recent only)
    Write-Host "📝 Backing up recent logs..." -ForegroundColor Green
    $logsSource = "C:\vtria-erp\logs"
    $logsBackup = Join-Path $BackupDir "logs"
    
    if (Test-Path $logsSource) {
        # Only backup logs from last 7 days
        $recentLogs = Get-ChildItem $logsSource -File | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) }
        if ($recentLogs.Count -gt 0) {
            New-Item -ItemType Directory -Path $logsBackup -Force | Out-Null
            $recentLogs | Copy-Item -Destination $logsBackup -Force
            Write-Host "  ✅ Recent logs backup completed: $($recentLogs.Count) files" -ForegroundColor Green
        }
    }

    # Create backup manifest
    Write-Host "📋 Creating backup manifest..." -ForegroundColor Green
    $manifest = @{
        BackupDate = $BackupDate
        BackupLocation = $BackupDir
        DatabaseBackup = $dbBackupFile
        UploadsBackup = $uploadsBackup
        ConfigFiles = $configFiles
        VtriaVersion = if (Test-Path "C:\vtria-erp\VERSION") { Get-Content "C:\vtria-erp\VERSION" } else { "Unknown" }
        DockerImages = (docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -like "*vtria*" })
    }
    
    $manifest | ConvertTo-Json -Depth 3 | Out-File -FilePath (Join-Path $BackupDir "backup-manifest.json") -Encoding UTF8

    # Calculate total backup size
    $totalSize = (Get-ChildItem $BackupDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB

    Write-Host ""
    Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Blue
    Write-Host "📍 Backup Location: $BackupDir" -ForegroundColor White
    Write-Host "💾 Total Size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor White
    Write-Host "🕒 Backup Time: $(Get-Date)" -ForegroundColor White
    Write-Host ""
    Write-Host "🔄 You can now safely proceed with your update!" -ForegroundColor Green
    Write-Host ""

    # Clean up old backups (keep last 5)
    $oldBackups = Get-ChildItem $BackupLocation -Directory | Where-Object { $_.Name -like "backup-*" } | Sort-Object Name -Descending | Select-Object -Skip 5
    if ($oldBackups.Count -gt 0) {
        Write-Host "🧹 Cleaning up old backups (keeping last 5)..." -ForegroundColor Yellow
        $oldBackups | ForEach-Object {
            Remove-Item $_.FullName -Recurse -Force
            Write-Host "  🗑️  Removed: $($_.Name)" -ForegroundColor Gray
        }
    }

} catch {
    Write-Host ""
    Write-Host "❌ Backup failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please resolve the issue before proceeding with updates." -ForegroundColor Yellow
    exit 1
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")