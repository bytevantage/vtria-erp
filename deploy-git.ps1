# Simplified VTRIA ERP Git-based deployment script for Windows Server
param(
    [string]$Branch = "main",
    [switch]$FirstTime = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/bytevantage/vtria-erp.git"
$DeployPath = "C:\vtria-erp"

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host "$(Get-Date -Format 'HH:mm:ss') $Message" -ForegroundColor $Color
}

Write-Status "Starting VTRIA ERP Git Deployment..." "Green"
Write-Status "Branch: $Branch" "Cyan"
Write-Status "Deploy Path: $DeployPath" "Cyan"

# Check if this is first-time deployment
if ($FirstTime) {
    Write-Status "FIRST-TIME DEPLOYMENT" "Yellow"

    # Check if directory already exists
    if (Test-Path $DeployPath) {
        Write-Status "ERROR: Directory $DeployPath already exists!" "Red"
        Write-Status "For updates, run without -FirstTime flag" "Yellow"
        Write-Status "Or delete the directory and try again" "Yellow"
        exit 1
    }

    # Clone repository
    Write-Status "Cloning repository..." "Cyan"
    git clone $RepoUrl $DeployPath

    if ($LASTEXITCODE -ne 0) {
        Write-Status "ERROR: Git clone failed!" "Red"
        exit 1
    }

    # Navigate to deployment directory
    cd $DeployPath

    # Checkout specified branch
    Write-Status "Switching to branch: $Branch" "Cyan"
    git checkout $Branch

    # Create production environment file
    Write-Status "Creating production environment file..." "Cyan"
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.production"
        Write-Status "Created .env.production from example" "Green"
        Write-Status "IMPORTANT: Edit .env.production with your production settings!" "Yellow"
    }

    # Build containers
    Write-Status "Building containers..." "Cyan"
    docker-compose -f docker-compose.windows.yml build

    Write-Status "First-time setup completed!" "Green"
    Write-Status "Next steps:" "Yellow"
    Write-Status "  1. Edit C:\vtria-erp\.env.production" "White"
    Write-Status "  2. Run: docker-compose -f docker-compose.windows.yml up -d" "White"

} else {
    Write-Status "UPDATE DEPLOYMENT" "Yellow"

    # Check if deployment directory exists
    if (!(Test-Path $DeployPath)) {
        Write-Status "ERROR: Deploy directory not found!" "Red"
        Write-Status "Use -FirstTime flag for initial deployment" "Yellow"
        exit 1
    }

    # Navigate to deployment directory
    cd $DeployPath

    # Check if this is a git repository
    if (!(Test-Path ".git")) {
        Write-Status "ERROR: Not a Git repository!" "Red"
        Write-Status "Use -FirstTime flag to set up Git deployment" "Yellow"
        exit 1
    }

    # Stop services
    Write-Status "Stopping services..." "Cyan"
    docker-compose -f docker-compose.windows.yml down

    # Create production environment file if it doesn't exist
    if (!(Test-Path ".env.production") -and (Test-Path ".env.example")) {
        Write-Status "Creating production environment file..." "Cyan"
        Copy-Item ".env.example" ".env.production"
        Write-Status "Created .env.production from example" "Green"
        Write-Status "IMPORTANT: Edit .env.production with your production settings!" "Yellow"
    }

    # Update code
    Write-Status "Fetching latest changes..." "Cyan"
    git fetch origin

    Write-Status "Updating to latest $Branch..." "Cyan"
    git checkout $Branch
    git reset --hard origin/$Branch

    # Rebuild containers
    Write-Status "Rebuilding containers..." "Cyan"
    docker-compose -f docker-compose.windows.yml build --no-cache

    # Start services
    Write-Status "Starting services..." "Cyan"
    docker-compose -f docker-compose.windows.yml up -d

    # Wait for services
    Write-Status "Waiting for services to initialize..." "Cyan"
    Start-Sleep -Seconds 10

    Write-Status "Update deployment completed!" "Green"
}

Write-Status "VTRIA ERP Access URLs:" "Cyan"
Write-Status "  Frontend: http://localhost:3000" "White"
Write-Status "  API: http://localhost:5000" "White"
Write-Status "  Database: localhost:3306" "White"

Write-Status "Git deployment process completed!" "Green"