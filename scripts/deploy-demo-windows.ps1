# VTRIA ERP - Demo Deployment Script for Windows
# Deploys the demo version on Windows Server with Docker

param(
    [string]$DeployDir = "C:\vtria-erp-demo",
    [string]$HttpPort = "3000",
    [string]$HttpsPort = "3001"
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

function Write-Status {
    param([string]$Message, [string]$Color = "Green")
    Write-Host "[INFO] $Message" -ForegroundColor $Colors[$Color]
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

function Write-Header {
    param([string]$Title)
    Write-Host "================================" -ForegroundColor $Colors.Blue
    Write-Host $Title -ForegroundColor $Colors.Blue
    Write-Host "================================" -ForegroundColor $Colors.Blue
}

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

# Check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    # Check Docker
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker not found"
        }
        Write-Status "Docker found: $dockerVersion"
    }
    catch {
        Write-Error "Docker is not installed or not running"
        exit 1
    }
    
    # Check Docker Compose
    try {
        $composeVersion = docker-compose --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Compose not found"
        }
        Write-Status "Docker Compose found: $composeVersion"
    }
    catch {
        Write-Error "Docker Compose is not installed"
        exit 1
    }
    
    # Check if ports are available
    $port3000 = Get-NetTCPConnection -LocalPort $HttpPort -ErrorAction SilentlyContinue
    $port3001 = Get-NetTCPConnection -LocalPort $HttpsPort -ErrorAction SilentlyContinue
    
    if ($port3000) {
        Write-Warning "Port $HttpPort is already in use"
        Write-Status "Attempting to stop existing services..." "Yellow"
        
        # Stop existing containers
        docker-compose down 2>$null
        docker stop vtria-erp-demo 2>$null
        docker rm vtria-erp-demo 2>$null
        
        # Kill processes using ports
        Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force 2>$null
    }
    
    Write-Status "Prerequisites check passed"
}

# Create backup if exists
function New-Backup {
    if (Test-Path $DeployDir) {
        Write-Status "Creating backup of existing installation..."
        
        $backupDir = "C:\backups\vtria-erp"
        $backupName = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $backupPath = Join-Path $backupDir $backupName
        
        New-Item -ItemType Directory -Force -Path $backupDir
        Copy-Item -Path $DeployDir -Destination $backupPath -Recurse
        
        # Create compressed backup
        Compress-Archive -Path $backupPath -Destination "$backupPath.zip" -Force
        Remove-Item -Path $backupPath -Recurse -Force
        
        Write-Status "Backup created: $backupPath.zip"
    }
}

# Stop existing services
function Stop-Services {
    Write-Status "Stopping existing services..."
    
    if (Test-Path "$DeployDir\docker-compose.yml") {
        Set-Location $DeployDir
        docker-compose down
        Write-Status "Services stopped"
    }
    
    # Clean up any remaining containers
    $container = docker ps -aq -f name="vtria-erp-demo" 2>$null
    if ($container) {
        docker rm -f $container
    }
}

# Pull latest images
function Get-LatestImages {
    Write-Status "Pulling latest demo images..."
    
    docker pull mysql:8.0
    docker pull redis:7-alpine
    
    Write-Status "Images pulled successfully"
}

# Deploy application
function Deploy-Application {
    Write-Status "Deploying VTRIA ERP Demo..."
    
    # Create deployment directory
    New-Item -ItemType Directory -Force -Path $DeployDir | Out-Null
    
    # Copy application files
    $sourceDir = Split-Path -Parent $PSScriptRoot
    Copy-Item -Path "$sourceDir\*" -Destination $DeployDir -Recurse -Force
    
    Set-Location $DeployDir
    
    # Create demo docker-compose file
    $dockerComposeContent = @"
version: '3.8'

services:
  vtria-erp:
    build: .
    container_name: vtria-erp-demo
    ports:
      - "$HttpPort`:3000"
      - "$HttpsPort`:3001"
    environment:
      - NODE_ENV=demo
      - DEMO_MODE=true
      - DB_HOST=vtria-erp-db
      - DB_PORT=3306
      - DB_NAME=vtria_demo
      - DB_USER=vtria_demo
      - DB_PASSWORD=demo123456
      - REDIS_HOST=vtria-erp-redis
      - REDIS_PORT=6379
      - JWT_SECRET=demo-jwt-secret-key
      - SESSION_SECRET=demo-session-secret
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  db:
    image: mysql:8.0
    container_name: vtria-erp-db
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=demo123456
      - MYSQL_DATABASE=vtria_demo
      - MYSQL_USER=vtria_demo
      - MYSQL_PASSWORD=demo123456
    volumes:
      - db-data:/var/lib/mysql
      - ./sql:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: vtria-erp-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  db-data:
  redis-data:
"@
    
    Set-Content -Path "docker-compose.yml" -Value $dockerComposeContent
    
    # Create demo environment file
    $envContent = @"
# VTRIA ERP Demo Environment
NODE_ENV=demo
DEMO_MODE=true
APP_NAME=VTRIA ERP Demo
VERSION=demo

# Database
DB_HOST=vtria-erp-db
DB_PORT=3306
DB_NAME=vtria_demo
DB_USER=vtria_demo
DB_PASSWORD=demo123456
DB_ROOT_PASSWORD=demo123456

# Security
JWT_SECRET=demo-jwt-secret-key
SESSION_SECRET=demo-session-secret

# Redis
REDIS_HOST=vtria-erp-redis
REDIS_PORT=6379

# Demo Settings
MAX_CONCURRENT_USERS=5
SESSION_TIMEOUT=7200
ENABLE_AUDIT_LOGGING=false
ENABLE_TWO_FACTOR_AUTH=false
AUTO_RESET_DATA=true
RESET_SCHEDULE=0 2 * * *
"@
    
    Set-Content -Path ".env" -Value $envContent
    
    # Start services
    docker-compose up -d --build
    
    Write-Status "Application deployed successfully"
}

# Wait for services to be ready
function Wait-ForReady {
    Write-Status "Waiting for services to be ready..."
    
    $maxAttempts = 60
    $attempt = 1
    
    do {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$HttpPort/health" -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Status "Services are ready!"
                return $true
            }
        }
        catch {
            Write-Status "Attempt $attempt/$maxAttempts - Waiting..." "Yellow"
            Start-Sleep -Seconds 10
            $attempt++
        }
    } while ($attempt -le $maxAttempts)
    
    Write-Error "Services failed to become ready within expected time"
    return $false
}

# Setup demo database
function Initialize-Database {
    Write-Status "Setting up demo database..."
    
    # Wait for database to be ready
    Start-Sleep -Seconds 30
    
    # Run database migrations
    docker exec vtria-erp-demo npm run migrate 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Database migration failed, continuing..."
    }
    
    # Create demo admin user
    docker exec vtria-erp-demo npm run setup-admin 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Admin setup failed, you may need to run it manually"
    }
    
    Write-Status "Database setup completed"
}

# Show deployment information
function Show-DeploymentInfo {
    Write-Header "Demo Deployment Complete"
    
    Write-Host "🎉 VTRIA ERP Demo deployed successfully!" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Host "📱 Access Information:" -ForegroundColor $Colors.White
    Write-Host "   URL: http://localhost:$HttpPort" -ForegroundColor $Colors.White
    Write-Host "   Health Check: http://localhost:$HttpPort/health" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "🔑 Default Login:" -ForegroundColor $Colors.White
    Write-Host "   Email: demo@vtria.com" -ForegroundColor $Colors.White
    Write-Host "   Password: Demo@123456" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "🔧 Management Commands:" -ForegroundColor $Colors.White
    Write-Host "   View logs: docker-compose logs -f" -ForegroundColor $Colors.White
    Write-Host "   Stop: docker-compose down" -ForegroundColor $Colors.White
    Write-Host "   Restart: docker-compose restart" -ForegroundColor $Colors.White
    Write-Host "   Status: docker-compose ps" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "📁 Important Locations:" -ForegroundColor $Colors.White
    Write-Host "   Deployment: $DeployDir" -ForegroundColor $Colors.White
    Write-Host "   Logs: $DeployDir\logs" -ForegroundColor $Colors.White
    Write-Host "   Config: $DeployDir\.env" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "🔄 Demo Features:" -ForegroundColor $Colors.White
    Write-Host "   - Sample data pre-loaded" -ForegroundColor $Colors.White
    Write-Host "   - 2-hour session timeout" -ForegroundColor $Colors.White
    Write-Host "   - Max 5 concurrent users" -ForegroundColor $Colors.White
    Write-Host "   - Auto-reset capability" -ForegroundColor $Colors.White
    Write-Host "   - No sensitive data" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "⚠️  Important Notes:" -ForegroundColor $Colors.Yellow
    Write-Host "   - This is a demo version for testing only" -ForegroundColor $Colors.Yellow
    Write-Host "   - Data may be reset periodically" -ForegroundColor $Colors.Yellow
    Write-Host "   - Not suitable for production use" -ForegroundColor $Colors.Yellow
    Write-Host "   - Use production version for live deployments" -ForegroundColor $Colors.Yellow
}

# Main execution
try {
    Write-Header "VTRIA ERP Demo Deployment for Windows Server"
    
    # Deployment steps
    Test-Prerequisites
    New-Backup
    Stop-Services
    Get-LatestImages
    Deploy-Application
    
    if (Wait-ForReady) {
        Initialize-Database
        Show-DeploymentInfo
        Write-Status "Demo deployment completed successfully!"
    } else {
        Write-Error "Deployment failed - services not ready"
        exit 1
    }
}
catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    exit 1
}
