# Windows Server Docker Deployment for VTRIA ERP
# PowerShell script to deploy VTRIA ERP on Windows Server

Write-Host "🚀 Starting VTRIA ERP Windows Production Deployment" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

# Check if running as Administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Error: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is installed and running
Write-Host "🔍 Checking Docker installation..." -ForegroundColor Blue
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker is not installed or not running!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop for Windows first." -ForegroundColor Yellow
    exit 1
}

# Check if Docker Compose is available
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose found: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker Compose is not available!" -ForegroundColor Red
    exit 1
}

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Error: .env.production file not found!" -ForegroundColor Red
    Write-Host "Creating template .env.production file..." -ForegroundColor Yellow
    
    $envContent = @"
# Production Environment Variables for Windows
NODE_ENV=production

# Database Configuration
DB_HOST=db
DB_PORT=3306
DB_USER=vtria_user
DB_PASS=CHANGE_THIS_PASSWORD
DB_NAME=vtria_erp
DB_ROOT_PASSWORD=CHANGE_THIS_ROOT_PASSWORD

# Security Configuration
JWT_SECRET=CHANGE_THIS_TO_VERY_LONG_SECURE_RANDOM_STRING_MINIMUM_32_CHARACTERS
JWT_EXPIRATION=24h
BYPASS_AUTH=false

# Server Configuration
PORT=3001
LOG_LEVEL=error

# Windows Specific Settings
TZ=UTC
"@
    
    $envContent | Out-File -FilePath ".env.production" -Encoding UTF8
    Write-Host "📝 Template .env.production created. Please edit it with your production values." -ForegroundColor Yellow
    Write-Host "⚠️  Make sure to change all passwords and the JWT secret!" -ForegroundColor Red
    exit 1
}

# Load environment variables
Write-Host "📋 Loading production environment..." -ForegroundColor Blue
$envVars = Get-Content ".env.production" | Where-Object { $_ -match "^[^#]" } | ForEach-Object {
    $key, $value = $_ -split "=", 2
    [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    Write-Host "  ✓ $key" -ForegroundColor Gray
}

# Validate critical environment variables
$requiredVars = @("DB_USER", "DB_PASS", "DB_NAME", "JWT_SECRET", "DB_ROOT_PASSWORD")
foreach ($var in $requiredVars) {
    $value = [System.Environment]::GetEnvironmentVariable($var)
    if ([string]::IsNullOrEmpty($value) -or $value.Contains("CHANGE_THIS")) {
        Write-Host "❌ Error: Environment variable $var is not properly set!" -ForegroundColor Red
        Write-Host "Please update .env.production with proper values." -ForegroundColor Yellow
        exit 1
    }
}

$jwtSecret = [System.Environment]::GetEnvironmentVariable("JWT_SECRET")
if ($jwtSecret.Length -lt 32) {
    Write-Host "❌ Error: JWT_SECRET must be at least 32 characters long!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment validation passed" -ForegroundColor Green

# Create necessary directories
Write-Host "📁 Creating directories..." -ForegroundColor Blue
$directories = @("logs", "uploads", "backups")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "  ✓ Created $dir" -ForegroundColor Gray
    }
}

# Stop existing containers if running
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Blue
docker-compose -f docker-compose.windows.yml down 2>$null

# Build and start production services
Write-Host "🏗️  Building Docker images..." -ForegroundColor Blue
docker-compose -f docker-compose.windows.yml build

Write-Host "🚀 Starting production services..." -ForegroundColor Blue
docker-compose -f docker-compose.windows.yml up -d

# Wait for services to start
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Blue
Start-Sleep -Seconds 30

# Test services
Write-Host "🏥 Testing services..." -ForegroundColor Blue

# Test API
$maxRetries = 5
for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ API is healthy" -ForegroundColor Green
            break
        }
    } catch {
        if ($i -eq $maxRetries) {
            Write-Host "  ❌ API health check failed after $maxRetries attempts" -ForegroundColor Red
            docker-compose -f docker-compose.windows.yml logs api
            exit 1
        }
        Write-Host "  ⏳ Waiting for API... (attempt $i/$maxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
}

# Test Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend is accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Frontend health check failed" -ForegroundColor Red
    docker-compose -f docker-compose.windows.yml logs client
}

Write-Host ""
Write-Host "🎉 VTRIA ERP Windows Production Deployment Complete!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Access Information:" -ForegroundColor Blue
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  API: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Default Admin Credentials:" -ForegroundColor Blue
Write-Host "  Email: admin@vtria.com" -ForegroundColor White
Write-Host "  Password: Admin123!" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Change the default admin password after first login" -ForegroundColor White
Write-Host "  2. Set up Windows Firewall rules for ports 3000 and 3001" -ForegroundColor White
Write-Host "  3. Configure SSL/TLS certificates for production" -ForegroundColor White
Write-Host "  4. Set up automated backups" -ForegroundColor White
Write-Host "  5. Configure Windows services for auto-start" -ForegroundColor White
Write-Host ""
Write-Host "📊 Management Commands:" -ForegroundColor Blue
Write-Host "  View logs: docker-compose -f docker-compose.windows.yml logs" -ForegroundColor White
Write-Host "  Stop services: docker-compose -f docker-compose.windows.yml down" -ForegroundColor White
Write-Host "  Restart services: docker-compose -f docker-compose.windows.yml restart" -ForegroundColor White