# VTRIA ERP - Database Migration Script for Windows
# Runs database migrations safely in order

Write-Host "🔄 VTRIA ERP Database Migration Starting..." -ForegroundColor Blue
Write-Host "============================================" -ForegroundColor Blue
Write-Host ""

$MigrationsPath = "C:\vtria-erp\sql\migrations"
$BackupBeforeMigration = $true

try {
    # Check if migrations directory exists
    if (-not (Test-Path $MigrationsPath)) {
        Write-Host "ℹ️  No migrations directory found at: $MigrationsPath" -ForegroundColor Yellow
        Write-Host "✅ No migrations needed - database is up to date!" -ForegroundColor Green
        exit 0
    }

    # Get all migration files
    $migrationFiles = Get-ChildItem $MigrationsPath -Filter "*.sql" | Sort-Object Name

    if ($migrationFiles.Count -eq 0) {
        Write-Host "ℹ️  No migration files found in: $MigrationsPath" -ForegroundColor Yellow
        Write-Host "✅ No migrations needed - database is up to date!" -ForegroundColor Green
        exit 0
    }

    Write-Host "📊 Found $($migrationFiles.Count) migration files:" -ForegroundColor Green
    $migrationFiles | ForEach-Object { Write-Host "  📄 $($_.Name)" -ForegroundColor Gray }
    Write-Host ""

    # Check if database is accessible
    Write-Host "🔍 Testing database connection..." -ForegroundColor Blue
    try {
        $testResult = docker exec vtria-erp-db mysql -u vtria_user -pSecurePassword123! -e "SELECT 1 as test" vtria_erp 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database connection successful" -ForegroundColor Green
        } else {
            throw "Database connection failed"
        }
    } catch {
        Write-Host "❌ Cannot connect to database. Ensure containers are running." -ForegroundColor Red
        Write-Host "Run: docker-compose -f docker-compose.windows.yml up -d" -ForegroundColor Yellow
        exit 1
    }

    # Create migrations tracking table if it doesn't exist
    Write-Host "📋 Setting up migrations tracking..." -ForegroundColor Blue
    $createTrackingTable = @"
CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INT DEFAULT NULL,
    status ENUM('success', 'failed') DEFAULT 'success'
);
"@

    $createTrackingTable | docker exec -i vtria-erp-db mysql -u vtria_user -pSecurePassword123! vtria_erp

    # Get already executed migrations
    $executedMigrations = docker exec vtria-erp-db mysql -u vtria_user -pSecurePassword123! -sN -e "SELECT version FROM schema_migrations WHERE status = 'success'" vtria_erp 2>$null
    $executedList = if ($executedMigrations) { $executedMigrations -split "`n" } else { @() }

    Write-Host "📊 Already executed migrations: $($executedList.Count)" -ForegroundColor Green
    $executedList | ForEach-Object { Write-Host "  ✅ $_" -ForegroundColor Gray }
    Write-Host ""

    # Filter pending migrations
    $pendingMigrations = $migrationFiles | Where-Object { $_.BaseName -notin $executedList }

    if ($pendingMigrations.Count -eq 0) {
        Write-Host "✅ All migrations already executed - database is up to date!" -ForegroundColor Green
        exit 0
    }

    Write-Host "🔄 Pending migrations: $($pendingMigrations.Count)" -ForegroundColor Yellow
    $pendingMigrations | ForEach-Object { Write-Host "  ⏳ $($_.Name)" -ForegroundColor Yellow }
    Write-Host ""

    # Optional backup before migrations
    if ($BackupBeforeMigration -and $pendingMigrations.Count -gt 0) {
        Write-Host "💾 Creating pre-migration backup..." -ForegroundColor Blue
        $backupFile = "C:\vtria-erp-backups\pre-migration-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
        $backupDir = Split-Path $backupFile -Parent
        
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }
        
        docker exec vtria-erp-db mysqldump -u vtria_user -pSecurePassword123! --routines --triggers --single-transaction vtria_erp | Out-File -FilePath $backupFile -Encoding UTF8
        Write-Host "✅ Pre-migration backup saved: $backupFile" -ForegroundColor Green
        Write-Host ""
    }

    # Execute pending migrations
    $successCount = 0
    $failureCount = 0

    foreach ($migration in $pendingMigrations) {
        Write-Host "🔄 Executing: $($migration.Name)" -ForegroundColor Blue
        $startTime = Get-Date

        try {
            # Read migration file content
            $migrationSQL = Get-Content $migration.FullName -Raw -Encoding UTF8

            # Execute migration
            $migrationSQL | docker exec -i vtria-erp-db mysql -u vtria_user -pSecurePassword123! vtria_erp

            if ($LASTEXITCODE -eq 0) {
                $endTime = Get-Date
                $executionTime = ($endTime - $startTime).TotalMilliseconds

                # Record successful migration
                $recordMigration = "INSERT INTO schema_migrations (version, execution_time_ms, status) VALUES ('$($migration.BaseName)', $([math]::Round($executionTime)), 'success')"
                $recordMigration | docker exec -i vtria-erp-db mysql -u vtria_user -pSecurePassword123! vtria_erp

                Write-Host "  ✅ Success ($([math]::Round($executionTime))ms)" -ForegroundColor Green
                $successCount++
            } else {
                throw "Migration execution failed with exit code: $LASTEXITCODE"
            }

        } catch {
            Write-Host "  ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
            
            # Record failed migration
            $recordFailure = "INSERT INTO schema_migrations (version, status) VALUES ('$($migration.BaseName)', 'failed')"
            $recordFailure | docker exec -i vtria-erp-db mysql -u vtria_user -pSecurePassword123! vtria_erp 2>$null

            $failureCount++
            
            Write-Host ""
            Write-Host "⚠️  Migration failed! You may need to:" -ForegroundColor Yellow
            Write-Host "   1. Fix the migration SQL" -ForegroundColor White
            Write-Host "   2. Manually resolve database conflicts" -ForegroundColor White
            Write-Host "   3. Remove failed entry: DELETE FROM schema_migrations WHERE version='$($migration.BaseName)'" -ForegroundColor White
            Write-Host ""
            break
        }
    }

    # Summary
    Write-Host ""
    Write-Host "📊 Migration Summary:" -ForegroundColor Blue
    Write-Host "============================================" -ForegroundColor Blue
    Write-Host "✅ Successful migrations: $successCount" -ForegroundColor Green
    if ($failureCount -gt 0) {
        Write-Host "❌ Failed migrations: $failureCount" -ForegroundColor Red
    }
    Write-Host "📊 Database schema version updated" -ForegroundColor Green

    if ($failureCount -eq 0) {
        Write-Host ""
        Write-Host "🎉 All migrations completed successfully!" -ForegroundColor Green
        Write-Host "✅ Database is now up to date with the latest schema" -ForegroundColor Green
    }

} catch {
    Write-Host ""
    Write-Host "❌ Migration process failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Database may be in an inconsistent state. Please:" -ForegroundColor Yellow
    Write-Host "1. Check the database connection" -ForegroundColor White
    Write-Host "2. Review migration files for syntax errors" -ForegroundColor White
    Write-Host "3. Consider restoring from backup if needed" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")