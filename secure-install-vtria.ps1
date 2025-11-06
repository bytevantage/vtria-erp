# Secure VTRIA ERP Installation Script
# Creates super admin account with secure default password

param(
    [string]$AdminEmail = "admin@vtria.in",
    [SecureString]$AdminPassword = $null
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

Write-Host "[OK] Docker is installed" -ForegroundColor Green

# Navigate to script directory
Set-Location $PSScriptRoot

# Check if Git is installed
try {
    git --version | Out-Null
} catch {
    Write-Host "Installing Git..." -ForegroundColor Yellow
    winget install --id Git.Git -e --source winget
    Write-Host "[OK] Git installed" -ForegroundColor Green
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

Write-Host "[OK] Repository ready" -ForegroundColor Green

# Generate secure default password if not provided
if (-not $AdminPassword) {
    $plainPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object {[char]$_})
    $AdminPassword = ConvertTo-SecureString -String $plainPassword -AsPlainText -Force
} else {
    # Convert SecureString back to plain text for database insertion
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPassword))
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
"#

$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host "[OK] Environment configured" -ForegroundColor Green

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
            Write-Host "[OK] Database is ready" -ForegroundColor Green
        }
    } catch {
        $attempts++
        Write-Host "Waiting for database... ($attempts/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $dbReady) {
    Write-Host "[ERROR] Database failed to start. Please check the logs." -ForegroundColor Red
    docker-compose logs db
    Exit 1
}

# Create super admin user
Write-Host "Creating super admin account..." -ForegroundColor Yellow
Write-Host "Email: $AdminEmail" -ForegroundColor DarkGray
Write-Host "Password: $plainPassword" -ForegroundColor DarkGray

# Hash the password using bcrypt (Node.js) with retry logic
$hashedPassword = $null
$hashAttempts = 0
while (-not $hashedPassword -and $hashAttempts -lt 5) {
    try {
        $hashedPassword = docker-compose exec -T api node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('$plainPassword', 10));" 2>$null
        $hashedPassword = $hashedPassword.Trim()
        if ($hashedPassword -and $hashedPassword.StartsWith('`$2')) {
            Write-Host "[OK] Password hashed successfully" -ForegroundColor Green
            break
        } else {
            $hashedPassword = $null
        }
    } catch {
        $hashAttempts++
        Write-Host "Retrying password hash... ($hashAttempts/5)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $hashedPassword) {
    Write-Host "[ERROR] Failed to hash password. Using default accounts instead." -ForegroundColor Red
    Write-Host "Login with: admin@vtria.com / Admin@123" -ForegroundColor Yellow
} else {
    # Insert super admin with correct schema
    $createUserSql = "INSERT INTO users (email, password_hash, full_name, user_role, status, created_at, updated_at) VALUES ('$AdminEmail', '$hashedPassword', 'Super Administrator', 'admin', 'active', NOW(), NOW()) ON DUPLICATE KEY UPDATE password_hash='$hashedPassword', updated_at=NOW();"
    
    $userCreated = $false
    $createAttempts = 0
    while (-not $userCreated -and $createAttempts -lt 5) {
        try {
            $result = docker-compose exec -T db mysql -u vtria_user --password=dev_password vtria_erp -e "$createUserSql" 2>&1
            if ($LASTEXITCODE -eq 0) {
                $userCreated = $true
                Write-Host "[OK] Super admin account created successfully" -ForegroundColor Green
            } else {
                $createAttempts++
                Write-Host "Retrying user creation... ($createAttempts/5)" -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            }
        } catch {
            $createAttempts++
            Write-Host "Retrying user creation... ($createAttempts/5)" -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
    
    if (-not $userCreated) {
        Write-Host "[WARNING] Custom admin account creation failed. Using default admin@vtria.com / Admin@123" -ForegroundColor Yellow
    }
}

# Create password reset script
$resetScript = @"
# VTRIA ERP Super Admin Password Reset
# Run this script only if you forget the super admin password

Write-Host "VTRIA ERP - Reset Super Admin Password" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

`$newPassword = Read-Host "Enter new password for super admin" -AsSecureString
`$newPasswordText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR(`$newPassword))

# Hash the new password using bcrypt
`$hashedPassword = docker-compose exec -T api node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('`$newPasswordText', 10));"

# Update password in database
`$updateSql = "UPDATE users SET password_hash='`$hashedPassword', updated_at=NOW() WHERE user_role='admin' AND email='$AdminEmail';"

try {
    docker-compose exec -T db mysql -u vtria_user --password=dev_password vtria_erp -e "`$updateSql"
    Write-Host "[OK] Super admin password reset successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to reset password" -ForegroundColor Red
}

Write-Host "You can now login with the new password." -ForegroundColor White
"@

$resetScript | Out-File -FilePath "reset-admin-password.ps1" -Encoding utf8

# Show completion message with security warning
Write-Host "`n[SUCCESS] VTRIA ERP has been securely installed!" -ForegroundColor Green
Write-Host "`n[ADMIN CREDENTIALS]:" -ForegroundColor Red
Write-Host "Email: $AdminEmail" -ForegroundColor White
Write-Host "Password: $plainPassword" -ForegroundColor White
Write-Host "`n[ALTERNATIVE DEFAULT ACCOUNTS]:" -ForegroundColor Cyan
Write-Host "If the above doesn't work, use these pre-configured accounts:" -ForegroundColor White
Write-Host "- admin@vtria.com / Admin@123" -ForegroundColor White
Write-Host "- director@vtria.com / Admin@123" -ForegroundColor White
Write-Host "- manager@vtria.com / Admin@123" -ForegroundColor White
Write-Host "`n[SECURITY WARNING]:" -ForegroundColor Yellow
Write-Host "1. Login immediately and change the password" -ForegroundColor Yellow
Write-Host "2. Save these credentials securely" -ForegroundColor Yellow
Write-Host "3. Delete this installation script after setup" -ForegroundColor Yellow
Write-Host "4. Use reset-admin-password.ps1 if you forget the password" -ForegroundColor Yellow

Write-Host "`nAccess VTRIA ERP at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "`nTo manage VTRIA ERP:" -ForegroundColor White
Write-Host "- Start: docker-compose up -d" -ForegroundColor White
Write-Host "- Stop: docker-compose down" -ForegroundColor White
Write-Host "- Status: docker-compose ps" -ForegroundColor White
Write-Host "- Reset password: .\reset-admin-password.ps1" -ForegroundColor White

Write-Host "`n[SECURITY] For security, please:" -ForegroundColor Red
Write-Host "- Change the super admin password immediately" -ForegroundColor Red
Write-Host "- Delete the installation script" -ForegroundColor Red
Write-Host "- Configure firewall rules" -ForegroundColor Red
