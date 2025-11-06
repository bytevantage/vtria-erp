# Secure VTRIA ERP Installation Script
# Creates super admin account with secure default password

param(
    [string]$AdminEmail = "admin@vtria.in",
    [string]$AdminPassword = $null
)

Write-Host "VTRIA ERP Secure Installation" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    Exit 1
}

# Check if Docker is installed
try {
    docker --version | Out-Null
    docker-compose --version | Out-Null
} catch {
    Write-Host "Docker or Docker Compose is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Exit 1
}

Write-Host "✅ Docker is installed" -ForegroundColor Green

# Navigate to script directory
Set-Location $PSScriptRoot

# Check if Git is installed
try {
    git --version | Out-Null
} catch {
    Write-Host "Installing Git..." -ForegroundColor Yellow
    winget install --id Git.Git -e --source winget
    Write-Host "✅ Git installed" -ForegroundColor Green
}

# Clone or update repository
if (Test-Path ".git") {
    Write-Host "Updating VTRIA ERP repository..." -ForegroundColor Yellow
    git pull origin main
} else {
    Write-Host "Cloning VTRIA ERP repository..." -ForegroundColor Yellow
    git clone https://github.com/bytevantage/vtria-erp.git .
    git checkout main
}

Write-Host "✅ Repository ready" -ForegroundColor Green

# Generate secure default password if not provided
if (-not $AdminPassword) {
    $AdminPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object {[char]$_})
}

# Create secure .env file
$envContent = @"
# VTRIA ERP Environment Configuration
NODE_ENV=production
DB_HOST=db
DB_PORT=3306
DB_USER=vtria_user
DB_PASS=dev_password
DB_NAME=vtria_erp
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=vtria_production_secret_key_$(Get-Random -Minimum 100000 -Maximum 999999)
BYPASS_AUTH=false

# Admin Account Configuration
ADMIN_EMAIL=$AdminEmail
ADMIN_PASSWORD=$AdminPassword
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host "✅ Environment configured" -ForegroundColor Green

# Build and start containers
Write-Host "Building and starting VTRIA ERP containers..." -ForegroundColor Cyan

docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to start
Write-Host "Waiting for services to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 45

# Wait for database to be ready
Write-Host "Waiting for database to be ready..." -ForegroundColor Cyan
$dbReady = $false
$attempts = 0
$maxAttempts = 30

while (-not $dbReady -and $attempts -lt $maxAttempts) {
    try {
        $result = docker-compose exec -T db mysqladmin ping -h localhost -u vtria_user --password=dev_password 2>$null
        if ($result -match "mysqld is alive") {
            $dbReady = $true
            Write-Host "✅ Database is ready" -ForegroundColor Green
        }
    } catch {
        $attempts++
        Write-Host "Waiting for database... ($attempts/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $dbReady) {
    Write-Host "❌ Database failed to start. Please check the logs." -ForegroundColor Red
    docker-compose logs db
    Exit 1
}

# Create super admin user
Write-Host "Creating super admin account..." -ForegroundColor Yellow

# Hash the password (using PHP's password_hash equivalent)
$hashedPassword = docker-compose exec -T api php -r "echo password_hash('$AdminPassword', PASSWORD_DEFAULT);"

# Insert super admin into database
$createUserSql = @"
INSERT INTO users (username, email, password, role, is_super_admin, created_at, updated_at) 
VALUES ('superadmin', '$AdminEmail', '$hashedPassword', 'admin', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE password='$hashedPassword', is_super_admin=1, updated_at=NOW();
"@

try {
    docker-compose exec -T db mysql -u vtria_user --password=dev_password vtria_erp -e "$createUserSql"
    Write-Host "✅ Super admin account created" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create super admin account" -ForegroundColor Red
    Write-Host "Please create admin account manually through the web interface." -ForegroundColor Yellow
}

# Create password reset script
$resetScript = @"
# VTRIA ERP Super Admin Password Reset
# Run this script only if you forget the super admin password

Write-Host "VTRIA ERP - Reset Super Admin Password" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

`$newPassword = Read-Host "Enter new password for super admin" -AsSecureString
`$newPasswordText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR(`$newPassword))

# Hash the new password
`$hashedPassword = docker-compose exec -T api php -r "echo password_hash('`$newPasswordText', PASSWORD_DEFAULT);"

# Update password in database
`$updateSql = "UPDATE users SET password='`$hashedPassword', updated_at=NOW() WHERE is_super_admin=1;"

try {
    docker-compose exec -T db mysql -u vtria_user --password=dev_password vtria_erp -e "`$updateSql"
    Write-Host "✅ Super admin password reset successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to reset password" -ForegroundColor Red
}

Write-Host "You can now login with the new password." -ForegroundColor White
"@

$resetScript | Out-File -FilePath "reset-admin-password.ps1" -Encoding utf8

# Show completion message with security warning
Write-Host "`n🎉 VTRIA ERP has been securely installed!" -ForegroundColor Green
Write-Host "`n🔐 ADMIN CREDENTIALS:" -ForegroundColor Red
Write-Host "📧 Email: $AdminEmail" -ForegroundColor White
Write-Host "🔑 Password: $AdminPassword" -ForegroundColor White
Write-Host "`n⚠️  SECURITY WARNING:" -ForegroundColor Yellow
Write-Host "1. Login immediately and change the password" -ForegroundColor Yellow
Write-Host "2. Save these credentials securely" -ForegroundColor Yellow
Write-Host "3. Delete this installation script after setup" -ForegroundColor Yellow
Write-Host "4. Use reset-admin-password.ps1 if you forget the password" -ForegroundColor Yellow

Write-Host "`n🌐 Access VTRIA ERP at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "`n📋 To manage VTRIA ERP:" -ForegroundColor White
Write-Host "- Start: docker-compose up -d" -ForegroundColor White
Write-Host "- Stop: docker-compose down" -ForegroundColor White
Write-Host "- Status: docker-compose ps" -ForegroundColor White
Write-Host "- Reset password: .\reset-admin-password.ps1" -ForegroundColor White

Write-Host "`n🔒 For security, please:" -ForegroundColor Red
Write-Host "- Change the super admin password immediately" -ForegroundColor Red
Write-Host "- Delete the installation script" -ForegroundColor Red
Write-Host "- Configure firewall rules" -ForegroundColor Red
