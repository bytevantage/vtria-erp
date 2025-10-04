# Git-based deployment script for Windows Server
param(
    [string]$Branch = "production",
    [switch]$FirstTime = $false,
    [switch]$BackupData = $true,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/srbhandary1/vtria-erp.git"
$DeployPath = "C:\vtria-erp"

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host "$(Get-Date -Format 'HH:mm:ss') $Message" -ForegroundColor $Color
}

Write-Status "🚀 VTRIA ERP Git Deployment Starting..." "Green"
Write-Status "📋 Branch: $Branch" "Cyan"
Write-Status "📍 Deploy Path: $DeployPath" "Cyan"

if ($FirstTime) {
    Write-Status "🔧 FIRST-TIME DEPLOYMENT" "Yellow"
    
    if (Test-Path $DeployPath) {
        Write-Status "❌ Directory $DeployPath already exists!" "Red"
        Write-Status "💡 Use without -FirstTime flag for updates" "Yellow"
        exit 1
    }
    
    Write-Status "📥 Cloning repository..." "Cyan"
    git clone $RepoUrl $DeployPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ Git clone failed!" "Red"
        exit 1
    }
    
    cd $DeployPath
    git checkout $Branch
    
    Write-Status "📄 Creating production environment file..." "Cyan"
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.production"
        Write-Status "✅ Created .env.production from example" "Green"
        Write-Status "⚠️ IMPORTANT: Edit .env.production with your production settings!" "Yellow"
    }
    
    Write-Status "🏗️ Building containers for first time..." "Cyan"
    docker-compose -f docker-compose.windows.yml build
    
    Write-Status "✅ First-time deployment completed!" "Green"
    Write-Status "🔧 Next steps:" "Yellow"
    Write-Status "  1. Edit C:\vtria-erp\.env.production" "White"
    Write-Status "  2. Run: docker-compose -f docker-compose.windows.yml up -d" "White"
    
} else {
    Write-Status "🔄 UPDATE DEPLOYMENT" "Yellow"
    
    if (!(Test-Path $DeployPath)) {
        Write-Status "❌ Deploy directory not found!" "Red"
        Write-Status "💡 Use -FirstTime flag for initial deployment" "Yellow"
        exit 1
    }
    
    cd $DeployPath
    
    # Check if Git repository
    if (!(Test-Path ".git")) {
        Write-Status "❌ Not a Git repository!" "Red"
        Write-Status "💡 Use -FirstTime flag to set up Git deployment" "Yellow"
        exit 1
    }
    
    if ($BackupData) {
        $BackupDate = Get-Date -Format "yyyyMMdd-HHmm"
        $BackupDir = "C:\backups\vtria-backup-$BackupDate"
        
        Write-Status "💾 Creating backup: $BackupDir" "Cyan"
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        
        # Backup uploads
        if (Test-Path "uploads") {
            Copy-Item "uploads" "$BackupDir\uploads" -Recurse -Force -ErrorAction SilentlyContinue
            Write-Status "✅ Uploads backed up" "Green"
        }
        
        # Backup environment
        if (Test-Path ".env.production") {
            Copy-Item ".env.production" "$BackupDir\.env.production" -Force -ErrorAction SilentlyContinue
            Write-Status "✅ Environment backed up" "Green"
        }
        
        # Backup custom configs
        if (Test-Path "logs") {
            Copy-Item "logs" "$BackupDir\logs" -Recurse -Force -ErrorAction SilentlyContinue
            Write-Status "✅ Logs backed up" "Green"
        }
    }
    
    # Check for uncommitted changes
    $GitStatus = git status --porcelain
    if ($GitStatus) {
        Write-Status "⚠️ Uncommitted changes detected:" "Yellow"
        if ($Verbose) {
            git status --short
        }
        
        Write-Status "💾 Stashing changes..." "Cyan"
        git stash push -m "Auto-stash before deployment $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }
    
    # Stop services
    Write-Status "⏹️ Stopping services..." "Cyan"
    docker-compose -f docker-compose.windows.yml down
    
    # Update code
    Write-Status "📥 Fetching latest changes..." "Cyan"
    git fetch origin
    
    $CurrentBranch = git branch --show-current
    Write-Status "📍 Current branch: $CurrentBranch" "Cyan"
    
    Write-Status "🔄 Updating to latest $Branch..." "Cyan"
    git checkout $Branch
    git reset --hard origin/$Branch
    
    # Restore backed up data
    if ($BackupData -and (Test-Path "C:\backups\vtria-backup-$BackupDate")) {
        Write-Status "📤 Restoring user data..." "Cyan"
        
        # Restore uploads
        if (Test-Path "C:\backups\vtria-backup-$BackupDate\uploads") {
            Remove-Item "uploads" -Recurse -Force -ErrorAction SilentlyContinue
            Copy-Item "C:\backups\vtria-backup-$BackupDate\uploads" "uploads" -Recurse -Force
            Write-Status "✅ Uploads restored" "Green"
        }
        
        # Restore environment (but don't overwrite if user has newer version)
        if (Test-Path "C:\backups\vtria-backup-$BackupDate\.env.production") {
            if (!(Test-Path ".env.production")) {
                Copy-Item "C:\backups\vtria-backup-$BackupDate\.env.production" ".env.production" -Force
                Write-Status "✅ Environment restored" "Green"
            } else {
                Write-Status "ℹ️ Environment file exists, backup available at backup location" "Yellow"
            }
        }
    }
    
    # Rebuild containers (only if Dockerfile changed)
    Write-Status "🏗️ Rebuilding containers..." "Cyan"
    docker-compose -f docker-compose.windows.yml build --no-cache
    
    # Start services
    Write-Status "🚀 Starting services..." "Cyan"
    docker-compose -f docker-compose.windows.yml up -d
    
    # Wait for services
    Write-Status "⏳ Waiting for services to initialize..." "Cyan"
    Start-Sleep -Seconds 10
    
    # Health check
    Write-Status "🩺 Checking service health..." "Cyan"
    
    try {
        $ApiResponse = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($ApiResponse.StatusCode -eq 200) {
            Write-Status "✅ API service healthy" "Green"
        }
    } catch {
        Write-Status "⚠️ API health check failed (may need more time)" "Yellow"
    }
    
    try {
        $FrontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($FrontendResponse.StatusCode -eq 200) {
            Write-Status "✅ Frontend service healthy" "Green"
        }
    } catch {
        Write-Status "⚠️ Frontend health check failed (may need more time)" "Yellow"
    }
    
    Write-Status "✅ Update deployment completed!" "Green"
}

Write-Status "🌐 VTRIA ERP Access URLs:" "Cyan"
Write-Status "  Frontend: http://localhost:3000" "White"
Write-Status "  API: http://localhost:5000" "White"
Write-Status "  Database: localhost:3306" "White"

Write-Status "📋 Deployment Summary:" "Cyan"
Write-Status "  Repository: $RepoUrl" "White"
Write-Status "  Branch: $Branch" "White"
Write-Status "  Deploy Path: $DeployPath" "White"
if ($BackupData) {
    Write-Status "  Backup: Created" "Green"
} else {
    Write-Status "  Backup: Skipped" "Yellow"
}

Write-Status "🎉 Git deployment process completed!" "Green"