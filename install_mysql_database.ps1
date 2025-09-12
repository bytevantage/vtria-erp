# MySQL Database Creation Script for VTRIA ERP
# This script creates the MySQL database for VTRIA ERP using WAMP

Write-Host "=== VTRIA ERP MySQL Database Setup ===" -ForegroundColor Cyan

# WAMP MySQL path
$mysqlPath = "C:\wamp64\bin\mysql\mysql8.0.31\bin"
if (-not (Test-Path $mysqlPath)) {
    # Try to find MySQL in WAMP directory
    $mysqlVersions = Get-ChildItem -Path "C:\wamp64\bin\mysql" -Directory | Sort-Object -Property Name -Descending
    if ($mysqlVersions.Count -eq 0) {
        Write-Host "MySQL not found in WAMP installation" -ForegroundColor Red
        exit 1
    }
    $mysqlPath = "C:\wamp64\bin\mysql\$($mysqlVersions[0].Name)\bin"
}

Write-Host "Found MySQL at $mysqlPath" -ForegroundColor Green

# MySQL credentials
$mysqlUser = "root"
$mysqlPassword = ""  # Default WAMP MySQL password is empty

# SQL script path
$sqlScriptPath = "C:\wamp64\www\vtria-erp\create_mysql_database.sql"
if (-not (Test-Path $sqlScriptPath)) {
    Write-Host "SQL script not found at $sqlScriptPath" -ForegroundColor Red
    exit 1
}

# Run the SQL script
Write-Host "Creating VTRIA ERP database..." -ForegroundColor Green
try {
    if ($mysqlPassword -eq "") {
        # No password
        & "$mysqlPath\mysql.exe" -u $mysqlUser < $sqlScriptPath
    } else {
        # With password
        & "$mysqlPath\mysql.exe" -u $mysqlUser -p"$mysqlPassword" < $sqlScriptPath
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create database. Error code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
    Write-Host "Database 'vtria_erp_dev' created successfully." -ForegroundColor Green
} catch {
    Write-Host "Error creating database: $_" -ForegroundColor Red
    exit 1
}

# Update the server's database configuration to use MySQL
$envFilePath = "C:\wamp64\www\vtria-erp\server\.env"
if (Test-Path $envFilePath) {
    Write-Host "Updating database configuration in .env file..." -ForegroundColor Green
    $envContent = Get-Content $envFilePath
    $updatedContent = $envContent -replace "DB_DIALECT=postgres", "DB_DIALECT=mysql"
    $updatedContent = $updatedContent -replace "DB_HOST=localhost", "DB_HOST=localhost"
    $updatedContent = $updatedContent -replace "DB_PORT=5432", "DB_PORT=3306"
    $updatedContent = $updatedContent -replace "DB_NAME=vtria_erp_dev", "DB_NAME=vtria_erp_dev"
    $updatedContent = $updatedContent -replace "DB_USER=postgres", "DB_USER=root"
    $updatedContent = $updatedContent -replace "DB_PASSWORD=.*", "DB_PASSWORD="
    Set-Content -Path $envFilePath -Value $updatedContent
    Write-Host "Database configuration updated successfully." -ForegroundColor Green
}

Write-Host "VTRIA ERP MySQL database setup completed successfully!" -ForegroundColor Cyan
Write-Host "Default Admin Login:" -ForegroundColor Yellow
Write-Host "Email: admin@vtria.com" -ForegroundColor Yellow
Write-Host "Password: VtriaAdmin@2024" -ForegroundColor Yellow
