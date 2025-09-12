# VTRIA ERP Database Setup Script
# This script creates the PostgreSQL database and runs all migrations

Write-Host "=== VTRIA ERP Database Setup ===" -ForegroundColor Cyan

# Set PostgreSQL password
$pgPassword = "ananyara1"
$env:PGPASSWORD = $pgPassword

# PostgreSQL bin path
$pgBinPath = "C:\Program Files\PostgreSQL\17\bin"

# Check if PostgreSQL bin path exists
if (-not (Test-Path $pgBinPath)) {
    Write-Host "PostgreSQL bin path not found at $pgBinPath" -ForegroundColor Red
    exit 1
}

# Drop database if it exists
Write-Host "Dropping existing database if it exists..." -ForegroundColor Yellow
& "$pgBinPath\dropdb.exe" -U postgres vtria_erp_dev --if-exists

# Create database
Write-Host "Creating VTRIA ERP database..." -ForegroundColor Green
& "$pgBinPath\createdb.exe" -U postgres vtria_erp_dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create database. Error code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
Write-Host "Database 'vtria_erp_dev' created successfully." -ForegroundColor Green

# Run each migration file individually
$schemaDir = "C:\wamp64\www\vtria-erp\database\schema"
$migrationFiles = @(
    "01_create_database.sql",
    "02_locations_and_users.sql",
    "03_products_and_stock.sql",
    "04_cases_and_tickets.sql",
    "05_documents_and_notifications.sql",
    "06_audit_and_views.sql",
    "07_seed_data.sql"
)

foreach ($file in $migrationFiles) {
    $filePath = Join-Path $schemaDir $file
    if (Test-Path $filePath) {
        Write-Host "Running migration: $file..." -ForegroundColor Green
        & "$pgBinPath\psql.exe" -U postgres -d vtria_erp_dev -f $filePath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to run migration $file. Error code: $LASTEXITCODE" -ForegroundColor Red
        } else {
            Write-Host "Migration $file completed successfully." -ForegroundColor Green
        }
    } else {
        Write-Host "Migration file not found: $filePath" -ForegroundColor Red
    }
}

Write-Host "VTRIA ERP database setup completed!" -ForegroundColor Cyan
Write-Host "Default Admin Login:" -ForegroundColor Yellow
Write-Host "Email: admin@vtria.com" -ForegroundColor Yellow
Write-Host "Password: VtriaAdmin@2024" -ForegroundColor Yellow
