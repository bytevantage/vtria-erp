# VTRIA ERP Windows Server Installation Script
# Run this script as Administrator on your Windows Server

# Configuration
$repoUrl = "https://github.com/bytevantage/vtria-erp.git"
$branch = "main"  # Change to 'production' for production deployment
$installDir = "C:\\vtria-erp"
$envFile = "$installDir\.env"

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    Exit 1
}

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git is not installed. Installing Git..." -ForegroundColor Yellow
    winget install --id Git.Git -e --source winget
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Git. Please install Git manually from https://git-scm.com/download/win" -ForegroundColor Red
        Exit 1
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Check if Docker is installed
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker Desktop is not installed. Installing Docker Desktop..." -ForegroundColor Yellow
    winget install -e --id Docker.DockerDesktop
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Docker Desktop. Please install it manually from https://www.docker.com/products/docker-desktop" -ForegroundColor Red
        Write-Host "After installation, please restart your computer and run this script again." -ForegroundColor Yellow
        Exit 1
    }
    Write-Host "Docker Desktop installed. Please start Docker Desktop, sign in, and run this script again." -ForegroundColor Yellow
    Exit 0
}

# Start Docker service if not running
$dockerRunning = (Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue).Status -eq 'Running'
if (-not $dockerRunning) {
    Write-Host "Starting Docker service..." -ForegroundColor Yellow
    Start-Service com.docker.service
    Start-Sleep -Seconds 30  # Wait for Docker to fully initialize
}

# Clone or update repository
if (Test-Path $installDir) {
    Write-Host "Updating existing installation..." -ForegroundColor Cyan
    Set-Location $installDir
    git fetch --all
    git reset --hard origin/$branch
    git checkout $branch
    git pull origin $branch
} else {
    Write-Host "Cloning VTRIA ERP repository..." -ForegroundColor Cyan
    git clone -b $branch $repoUrl $installDir
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to clone repository." -ForegroundColor Red
        Exit 1
    }
    Set-Location $installDir
}

# Create .env file if it doesn't exist
if (-not (Test-Path $envFile)) {
    Write-Host "Creating .env configuration file..." -ForegroundColor Cyan
    @"
# Database Configuration
DB_HOST=db
DB_PORT=3306
DB_DATABASE=vtria_erp
DB_USERNAME=vtria_user
DB_PASSWORD=vtria_password

# Application Configuration
APP_ENV=production
APP_DEBUG=false
APP_KEY=
APP_URL=http://localhost:8000

# Demo Configuration (for demo installations)
DEMO_MODE=true
DEMO_USER=demo@vtria.com
DEMO_PASSWORD=Demo@123456
"@ | Out-File -FilePath $envFile -Encoding utf8
    
    Write-Host "Please edit $envFile to configure your installation." -ForegroundColor Yellow
}

# Build and start containers
Write-Host "Building and starting VTRIA ERP containers..." -ForegroundColor Cyan

docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Set the access URL
$appUrl = "http://localhost:8080"

# Wait for services to start
Write-Host "Waiting for services to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Install PHP dependencies and setup database
Write-Host "Installing dependencies and setting up database..." -ForegroundColor Cyan
docker-compose exec app composer install --no-interaction --no-progress
docker-compose exec app php artisan key:generate
docker-compose exec app php artisan migrate --seed --force

docker-compose exec app php artisan storage:link

docker-compose exec app php artisan optimize:clear

# Set permissions
Write-Host "Setting up permissions..." -ForegroundColor Cyan
docker-compose exec app chown -R www-data:www-data storage bootstrap/cache

docker-compose exec app chmod -R 775 storage bootstrap/cache

# Create super admin account with secure password
Write-Host "Creating secure super admin account..." -ForegroundColor Yellow

# Generate secure password
$adminPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object {[char]$_})

# Hash the password
$hashedPassword = docker-compose exec -T api php -r "echo password_hash('$adminPassword', PASSWORD_DEFAULT);"

# Insert super admin
$createUserSql = @"
INSERT INTO users (username, email, password, role, is_super_admin, created_at, updated_at) 
VALUES ('superadmin', 'admin@vtria.in', '$hashedPassword', 'admin', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE password='$hashedPassword', is_super_admin=1, updated_at=NOW();
"@

try {
    docker-compose exec -T db mysql -u vtria_user --password=dev_password vtria_erp -e "$createUserSql"
    Write-Host "✅ Super admin account created" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Admin account creation failed. Please create manually." -ForegroundColor Yellow
}

# Create password reset script
$resetScript = @"
# VTRIA ERP Super Admin Password Reset
Write-Host "Resetting super admin password..." -ForegroundColor Cyan
`$newPassword = Read-Host "Enter new password" -AsSecureString
`$newPasswordText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR(`$newPassword))
`$hashedPassword = docker-compose exec -T api php -r "echo password_hash('`$newPasswordText', PASSWORD_DEFAULT);"
docker-compose exec -T db mysql -u vtria_user --password=dev_password vtria_erp -e "UPDATE users SET password='`$hashedPassword', updated_at=NOW() WHERE is_super_admin=1;"
Write-Host "✅ Password reset successfully" -ForegroundColor Green
"@

$resetScript | Out-File -FilePath "reset-admin-password.ps1" -Encoding utf8

# Show completion message with security warning
Write-Host "`n🎉 VTRIA ERP has been securely installed!" -ForegroundColor Green
Write-Host "`n🔐 SUPER ADMIN CREDENTIALS:" -ForegroundColor Red
Write-Host "📧 Email: admin@vtria.in" -ForegroundColor White
Write-Host "🔑 Password: $adminPassword" -ForegroundColor White
Write-Host "`n⚠️  SECURITY WARNING:" -ForegroundColor Yellow
Write-Host "1. Login immediately and change the password" -ForegroundColor Yellow
Write-Host "2. Save these credentials securely" -ForegroundColor Yellow
Write-Host "3. Delete this installation script after setup" -ForegroundColor Yellow
Write-Host "4. Use reset-admin-password.ps1 if you forget the password" -ForegroundColor Yellow

Write-Host "`n🌐 Access VTRIA ERP at: $appUrl" -ForegroundColor Cyan
Write-Host "`n📋 To manage VTRIA ERP:" -ForegroundColor White
Write-Host "- Start: docker-compose up -d" -ForegroundColor White
Write-Host "- Stop: docker-compose down" -ForegroundColor White
Write-Host "- Reset password: .\reset-admin-password.ps1" -ForegroundColor White
