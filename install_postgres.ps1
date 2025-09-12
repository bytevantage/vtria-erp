# PostgreSQL Installation Script for VTRIA ERP
# This script downloads and installs PostgreSQL 14 for VTRIA ERP

Write-Host "=== PostgreSQL Installation for VTRIA ERP ===" -ForegroundColor Cyan
Write-Host "This script will download and install PostgreSQL 14 for VTRIA ERP." -ForegroundColor Yellow

# Create download directory
$downloadDir = "C:\wamp64\www\vtria-erp\temp"
if (-not (Test-Path $downloadDir)) {
    New-Item -Path $downloadDir -ItemType Directory
}

# Download PostgreSQL installer
$url = "https://get.enterprisedb.com/postgresql/postgresql-14.10-1-windows-x64.exe"
$installerPath = "$downloadDir\postgresql-14.10-1-windows-x64.exe"

Write-Host "Downloading PostgreSQL installer..." -ForegroundColor Green
try {
    Invoke-WebRequest -Uri $url -OutFile $installerPath
    Write-Host "Download completed successfully." -ForegroundColor Green
} catch {
    Write-Host "Failed to download PostgreSQL installer: $_" -ForegroundColor Red
    exit 1
}

# Install PostgreSQL
Write-Host "Installing PostgreSQL..." -ForegroundColor Green
$installArgs = "--mode unattended --superpassword ananyara1 --servicename PostgreSQL --servicepassword ananyara1 --serverport 5432"

try {
    Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait
    Write-Host "PostgreSQL installation completed." -ForegroundColor Green
} catch {
    Write-Host "Failed to install PostgreSQL: $_" -ForegroundColor Red
    exit 1
}

# Create database
Write-Host "Creating VTRIA ERP database..." -ForegroundColor Green
$env:PGPASSWORD = "ananyara1"
$createDbCmd = "createdb -U postgres vtria_erp_dev"

try {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c $createDbCmd" -Wait
    Write-Host "Database created successfully." -ForegroundColor Green
} catch {
    Write-Host "Failed to create database: $_" -ForegroundColor Red
    exit 1
}

Write-Host "PostgreSQL installation and database setup completed successfully!" -ForegroundColor Cyan
