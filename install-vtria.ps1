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

# Try to start with default ports first
Write-Host "Attempting to start with default ports..." -ForegroundColor Yellow
docker-compose up -d

# Wait a moment and check if port 80 failed
Start-Sleep -Seconds 10
$port80Check = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }

if (-not $port80Check) {
    Write-Host "Port 80 access denied. Using alternative port 8080..." -ForegroundColor Yellow
    
    # Stop containers
    docker-compose down -v
    
    # Use alternative ports configuration
    if (Test-Path "docker-compose-alt-ports.yml") {
        Write-Host "Starting with alternative ports (8080)..." -ForegroundColor Green
        docker-compose -f docker-compose-alt-ports.yml up -d
        
        # Update access URL
        $appUrl = "http://localhost:8080"
        Write-Host "VTRIA ERP will be accessible at: $appUrl" -ForegroundColor Cyan
    } else {
        Write-Host "Alternative port configuration not found. Creating it..." -ForegroundColor Yellow
        # Create alternative configuration on the fly
        $altConfig = @"
services:
  api:
    build:
      context: ./api
      target: production
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USER=vtria_user
      - DB_PASS=dev_password
      - DB_NAME=vtria_erp
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=vtria_production_secret_key_2025_secure_random_string_for_jwt_signing
      - BYPASS_AUTH=true
    depends_on:
      - db
      - redis

  client:
    build:
      context: ./client
      target: production
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=http://localhost:3001
    depends_on:
      - api

  db:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=vtria_erp
      - MYSQL_USER=vtria_user
      - MYSQL_PASSWORD=dev_password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
"@
        $altConfig | Out-File -FilePath "docker-compose-alt-ports.yml" -Encoding utf8
        docker-compose -f docker-compose-alt-ports.yml up -d
        $appUrl = "http://localhost:8080"
    }
} else {
    $appUrl = "http://localhost"
}

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

# Show completion message
Write-Host "`nVTRIA ERP has been successfully installed!" -ForegroundColor Green
Write-Host "`nAccess the application at: $appUrl" -ForegroundColor Cyan
Write-Host "Demo credentials:" -ForegroundColor Cyan
Write-Host "- Email: demo@vtria.com" -ForegroundColor Cyan
Write-Host "- Password: Demo@123456" -ForegroundColor Cyan

if ($appUrl -eq "http://localhost:8080") {
    Write-Host "`nNote: Port 80 was not available, so VTRIA ERP is running on port 8080." -ForegroundColor Yellow
    Write-Host "To use port 8080 permanently, run:" -ForegroundColor Yellow
    Write-Host "docker-compose -f docker-compose-alt-ports.yml up -d" -ForegroundColor White
}

Write-Host "`nTo stop the application, run: docker-compose down" -ForegroundColor Yellow
Write-Host "To start the application again, run: docker-compose up -d" -ForegroundColor Yellow
