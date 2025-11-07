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
DB_PASSWORD=dev_password

# Application Configuration
NODE_ENV=production
APP_URL=http://localhost:8000

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=vtria_production_secret_key_$(Get-Random -Minimum 100000 -Maximum 999999)
"@ | Out-File -FilePath $envFile -Encoding utf8
    
    Write-Host "Please edit $envFile to configure your installation." -ForegroundColor Yellow
}

# Build and start containers
Write-Host "Building and starting VTRIA ERP containers..." -ForegroundColor Cyan

# Stop and remove any existing containers and volumes to force fresh database initialization
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Set the access URL
$appUrl = "http://localhost:8000"

# Wait for services to start
Write-Host "Waiting for services to start..." -ForegroundColor Cyan
Write-Host "Initializing database with all schema files..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Wait for database to be ready
Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
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
    Write-Host "[ERROR] Database failed to start. Please check logs: docker-compose logs db" -ForegroundColor Red
    Exit 1
}

# Wait for API to be ready
Write-Host "Waiting for API to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verify database tables were created
Write-Host "Verifying database initialization..." -ForegroundColor Yellow
$tableCountOutput = docker-compose exec -T db mysql -u vtria_user --password=dev_password vtria_erp -e "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'vtria_erp';" 2>$null
$tableCount = $tableCountOutput -replace '\D', ''
if ([string]::IsNullOrEmpty($tableCount)) {
    Write-Host "[WARNING] Could not determine table count. Output: $tableCountOutput" -ForegroundColor Yellow
} elseif ([int]$tableCount -gt 5) {
    Write-Host "[OK] Database initialized with $tableCount tables" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Database may not be fully initialized. Found tables: $tableCount" -ForegroundColor Yellow
}

# Create super admin account with secure password
Write-Host "Creating secure super admin account..." -ForegroundColor Yellow

# Generate secure password
$adminPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object {[char]$_})
Write-Host "Generated password: $adminPassword" -ForegroundColor DarkGray

# Hash the password using bcryptjs (matches API library) with retry logic
$hashedPassword = $null
$hashAttempts = 0
while (-not $hashedPassword -and $hashAttempts -lt 5) {
    try {
        $hashedPassword = docker-compose exec -T api node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$adminPassword', 10));" 2>$null
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
    $createUserSql = "INSERT INTO users (email, password_hash, full_name, user_role, status, created_at, updated_at) VALUES ('admin@vtria.in', '$hashedPassword', 'Super Administrator', 'admin', 'active', NOW(), NOW()) ON DUPLICATE KEY UPDATE password_hash='$hashedPassword', updated_at=NOW();"
    
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
        $adminPassword = "Admin@123"
    }
}

# Create password reset script
$resetScript = @"
# VTRIA ERP Super Admin Password Reset
Write-Host "Resetting super admin password..." -ForegroundColor Cyan
`$newPassword = Read-Host "Enter new password" -AsSecureString
`$newPasswordText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR(`$newPassword))
`$hashedPassword = docker-compose exec -T api node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('`$newPasswordText', 10));"
docker-compose exec -T db mysql -u vtria_user --password=dev_password vtria_erp -e "UPDATE users SET password_hash='`$hashedPassword', updated_at=NOW() WHERE email='admin@vtria.in';"
Write-Host "[SUCCESS] Password reset successfully" -ForegroundColor Green
Write-Host "You can now login with admin@vtria.in and your new password" -ForegroundColor White
"@

$resetScript | Out-File -FilePath "reset-admin-password.ps1" -Encoding utf8

# Show completion message with security warning
Write-Host "`n[SUCCESS] VTRIA ERP has been securely installed!" -ForegroundColor Green
Write-Host "`n[ADMIN CREDENTIALS]:" -ForegroundColor Red
Write-Host "Email: admin@vtria.in" -ForegroundColor White
Write-Host "Password: $adminPassword" -ForegroundColor White
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

Write-Host "`nAccess VTRIA ERP at: $appUrl" -ForegroundColor Cyan
Write-Host "`nTo manage VTRIA ERP:" -ForegroundColor White
Write-Host "- Start: docker-compose up -d" -ForegroundColor White
Write-Host "- Stop: docker-compose down" -ForegroundColor White
Write-Host "- Reset password: .\reset-admin-password.ps1" -ForegroundColor White
