# PostgreSQL Database Creation Script for VTRIA ERP
# This script creates the PostgreSQL database for VTRIA ERP

Write-Host "=== VTRIA ERP Database Setup ===" -ForegroundColor Cyan

# Check if PostgreSQL is installed
$pgPath = "C:\Program Files\PostgreSQL"
if (-not (Test-Path $pgPath)) {
    Write-Host "PostgreSQL installation not found at $pgPath" -ForegroundColor Red
    Write-Host "Please install PostgreSQL 14 or later before running this script." -ForegroundColor Yellow
    exit 1
}

# Find PostgreSQL version
$pgVersions = Get-ChildItem -Path $pgPath -Directory | Sort-Object -Property Name -Descending
if ($pgVersions.Count -eq 0) {
    Write-Host "No PostgreSQL versions found in $pgPath" -ForegroundColor Red
    exit 1
}

$pgVersion = $pgVersions[0].Name
$pgBinPath = "$pgPath\$pgVersion\bin"
Write-Host "Found PostgreSQL version $pgVersion at $pgBinPath" -ForegroundColor Green

# Set PostgreSQL password
$pgPassword = "ananyara1"
$env:PGPASSWORD = $pgPassword

# Create database
Write-Host "Creating VTRIA ERP database..." -ForegroundColor Green
try {
    & "$pgBinPath\createdb.exe" -U postgres vtria_erp_dev
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create database. Error code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
    Write-Host "Database 'vtria_erp_dev' created successfully." -ForegroundColor Green
} catch {
    Write-Host "Error creating database: $_" -ForegroundColor Red
    exit 1
}

# Run migrations
$migrationPath = "C:\wamp64\www\vtria-erp\database\migration\run_migrations.sql"
Write-Host "Running database migrations from $migrationPath..." -ForegroundColor Green
try {
    & "$pgBinPath\psql.exe" -U postgres -d vtria_erp_dev -f $migrationPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to run migrations. Error code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
    Write-Host "Database migrations completed successfully." -ForegroundColor Green
} catch {
    Write-Host "Error running migrations: $_" -ForegroundColor Red
    exit 1
}

Write-Host "VTRIA ERP database setup completed successfully!" -ForegroundColor Cyan
Write-Host "Default Admin Login:" -ForegroundColor Yellow
Write-Host "Email: admin@vtria.com" -ForegroundColor Yellow
Write-Host "Password: VtriaAdmin@2024" -ForegroundColor Yellow
