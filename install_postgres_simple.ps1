# Simple PostgreSQL Installation and Database Setup Script for VTRIA ERP
# This script downloads PostgreSQL installer and sets up the database

# Create download directory
$downloadDir = "$env:TEMP\vtria-erp-temp"
New-Item -Path $downloadDir -ItemType Directory -Force | Out-Null

# Download PostgreSQL installer
$installerUrl = "https://sbp.enterprisedb.com/getfile.jsp?fileid=1258247"
$installerPath = "$downloadDir\postgresql_installer.exe"

Write-Host "Downloading PostgreSQL installer..." -ForegroundColor Green
Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath

# Install PostgreSQL
Write-Host "Installing PostgreSQL..." -ForegroundColor Green
Start-Process -FilePath $installerPath -ArgumentList "--mode unattended --superpassword ananyara1 --servicename PostgreSQL --servicepassword ananyara1 --serverport 5432" -Wait

# Wait for PostgreSQL to start
Write-Host "Waiting for PostgreSQL service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Create database
$env:PGPASSWORD = "ananyara1"
Write-Host "Creating database..." -ForegroundColor Green
& "C:\Program Files\PostgreSQL\14\bin\createdb.exe" -U postgres vtria_erp_dev

# Run migrations
Write-Host "Running migrations..." -ForegroundColor Green
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -d vtria_erp_dev -f "C:\wamp64\www\vtria-erp\database\migration\run_migrations.sql"

Write-Host "Database setup completed!" -ForegroundColor Cyan
