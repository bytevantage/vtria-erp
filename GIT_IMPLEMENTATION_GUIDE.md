# 🚀 Git Implementation Guide for VTRIA ERP

## 📋 Current Status
- ✅ Git repository: **ALREADY INITIALIZED**
- ✅ GitHub remote: `https://github.com/srbhandary1/vtria-erp.git`
- ✅ Current branch: `develop`
- ⚠️ Many staged and unstaged changes ready for commit

## 🎯 Git Workflow Implementation

### 1. **Immediate Setup - Clean Current State**

```bash
# First, let's commit all your current work
git add .
git commit -m "feat: Complete VTRIA ERP system with production deployment

- Added Windows deployment configuration
- Implemented enhanced safe update system  
- Fixed quotation workflow for approved estimations
- Added comprehensive production documentation
- Configured authentication system for production
- Added Docker Windows setup with data persistence"

# Push to GitHub
git push origin develop
```

### 2. **Production-Ready Branch Strategy**

```bash
# Create production branch from develop
git checkout -b production
git push -u origin production

# Create main branch for stable releases
git checkout -b main
git push -u origin main

# Set main as default branch (run this once)
git branch -M main
git push -u origin main
```

### 3. **Windows Server Git Deployment Setup**

#### Option A: Direct Git Clone (Recommended)
```powershell
# On Windows Server - One-time setup
cd C:\
git clone https://github.com/srbhandary1/vtria-erp.git
cd vtria-erp
git checkout production

# Create production environment file
Copy-Item ".env.example" ".env.production"
# Edit .env.production with your production settings

# Start services
docker-compose -f docker-compose.windows.yml up -d
```

#### Option B: Automated Git Deployment Script
Create `deploy-git.ps1`:

```powershell
# Git-based deployment script for Windows
param(
    [string]$Branch = "production",
    [switch]$FirstTime = $false,
    [switch]$BackupData = $true
)

$RepoUrl = "https://github.com/srbhandary1/vtria-erp.git"
$DeployPath = "C:\vtria-erp"

if ($FirstTime) {
    # Initial deployment
    Write-Host "🚀 First-time Git deployment..." -ForegroundColor Green
    
    if (Test-Path $DeployPath) {
        Write-Host "❌ Directory exists. Use -BackupData to preserve existing data" -ForegroundColor Red
        exit 1
    }
    
    git clone $RepoUrl $DeployPath
    cd $DeployPath
    git checkout $Branch
    
} else {
    # Update deployment
    Write-Host "🔄 Updating from Git..." -ForegroundColor Green
    
    if ($BackupData) {
        # Backup critical data
        $BackupDate = Get-Date -Format "yyyyMMdd-HHmm"
        Copy-Item "$DeployPath\uploads" "C:\backups\uploads-$BackupDate" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item "$DeployPath\.env.production" "C:\backups\env-$BackupDate" -Force -ErrorAction SilentlyContinue
    }
    
    cd $DeployPath
    
    # Stop services
    docker-compose -f docker-compose.windows.yml down
    
    # Update code
    git fetch origin
    git checkout $Branch
    git reset --hard origin/$Branch
    
    # Restore data if backed up
    if ($BackupData -and (Test-Path "C:\backups\uploads-$BackupDate")) {
        Copy-Item "C:\backups\uploads-$BackupDate\*" "$DeployPath\uploads\" -Recurse -Force
        Copy-Item "C:\backups\env-$BackupDate" "$DeployPath\.env.production" -Force
    }
    
    # Restart services
    docker-compose -f docker-compose.windows.yml up -d
}

Write-Host "✅ Git deployment completed!" -ForegroundColor Green
```

### 4. **Development Workflow**

#### Daily Development Process:
```bash
# Start work on new feature
git checkout develop
git pull origin develop
git checkout -b feature/new-feature-name

# Make changes, commit frequently
git add .
git commit -m "feat: add new feature functionality"

# When feature is complete
git checkout develop
git pull origin develop
git merge feature/new-feature-name
git push origin develop

# Clean up
git branch -d feature/new-feature-name
```

#### Hotfix Process:
```bash
# Critical production fix
git checkout production
git pull origin production
git checkout -b hotfix/critical-fix

# Make fix
git add .
git commit -m "fix: critical production issue"

# Deploy to production
git checkout production
git merge hotfix/critical-fix
git push origin production

# Also merge to develop
git checkout develop
git merge hotfix/critical-fix
git push origin develop

# Clean up
git branch -d hotfix/critical-fix
```

## 🏗️ Enhanced Git Setup Scripts

### Windows Setup Script (`setup-git-windows.bat`):
```batch
@echo off
echo 🚀 Setting up Git-based deployment for VTRIA ERP

REM Check if Git is installed
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Git is not installed. Please install Git for Windows first.
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git detected

REM Setup deployment directory
if not exist "C:\vtria-erp" (
    echo 📁 Cloning repository...
    git clone https://github.com/srbhandary1/vtria-erp.git C:\vtria-erp
    cd C:\vtria-erp
    git checkout production
) else (
    echo 📁 Repository exists, updating...
    cd C:\vtria-erp
    git fetch origin
    git checkout production
    git reset --hard origin/production
)

echo ✅ Git setup completed!
echo 🌐 Ready to deploy with: docker-compose -f docker-compose.windows.yml up -d
pause
```

### Update Script (`update-from-git.ps1`):
```powershell
# Safe Git-based update with data preservation
$ErrorActionPreference = "Stop"

Write-Host "🔄 VTRIA ERP Git Update Process" -ForegroundColor Green

# Navigate to deployment directory
cd C:\vtria-erp

# Check if we have uncommitted changes
$Status = git status --porcelain
if ($Status) {
    Write-Host "⚠️ You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    
    $Response = Read-Host "Do you want to stash these changes? (y/N)"
    if ($Response -eq 'y' -or $Response -eq 'Y') {
        git stash push -m "Auto-stash before update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        Write-Host "✅ Changes stashed" -ForegroundColor Green
    }
}

# Stop services
Write-Host "⏹️ Stopping services..." -ForegroundColor Cyan
docker-compose -f docker-compose.windows.yml down

# Update from Git
Write-Host "📥 Fetching updates..." -ForegroundColor Cyan
git fetch origin

$CurrentBranch = git branch --show-current
Write-Host "📍 Current branch: $CurrentBranch" -ForegroundColor Cyan

git reset --hard origin/$CurrentBranch
Write-Host "✅ Code updated to latest version" -ForegroundColor Green

# Rebuild and start
Write-Host "🏗️ Rebuilding containers..." -ForegroundColor Cyan
docker-compose -f docker-compose.windows.yml build --no-cache

Write-Host "🚀 Starting services..." -ForegroundColor Cyan
docker-compose -f docker-compose.windows.yml up -d

Write-Host "✅ Update completed!" -ForegroundColor Green
Write-Host "🌐 Application available at:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  API: http://localhost:5000" -ForegroundColor White
```

## 🔒 Git Security & Best Practices

### 1. **Environment Variables Management**
```bash
# Never commit sensitive data
echo "# Environment files
.env
.env.production
.env.local
*.env
!.env.example

# Database
*.sql.backup
database_backups/

# Logs
*.log
logs/
api/logs/

# Uploads (optional - comment if you want to version control uploads)
uploads/
api/uploads/" >> .gitignore
```

### 2. **Git Hooks for Quality Control**
Create `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linting
npm run lint --if-present

# Check for sensitive data
if grep -r "password\|secret\|key" --include="*.js" --include="*.json" --exclude-dir=node_modules .; then
  echo "⚠️ Possible sensitive data detected!"
  exit 1
fi

echo "✅ Pre-commit checks passed"
```

### 3. **Automated Deployment Webhook**
For automatic deployment when you push to production branch:

```javascript
// webhook-listener.js - Run on Windows Server
const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'your-webhook-secret';

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
    
  if (`sha256=${expectedSignature}` !== signature) {
    return res.status(401).send('Unauthorized');
  }
  
  // Check if push to production branch
  if (req.body.ref === 'refs/heads/production') {
    console.log('🚀 Production deployment triggered');
    
    exec('powershell -File C:\\vtria-erp\\update-from-git.ps1', (error, stdout, stderr) => {
      if (error) {
        console.error('Deployment failed:', error);
        return;
      }
      console.log('✅ Deployment successful');
    });
  }
  
  res.status(200).send('OK');
});

app.listen(9000, () => {
  console.log('🎣 Webhook listener running on port 9000');
});
```

## 📊 Git Branch Strategy Summary

```
main (production-ready releases)
├── production (production deployment branch)
├── develop (integration branch)
├── feature/estimation-enhancements
├── feature/windows-deployment
├── hotfix/critical-auth-fix
└── release/v2.0.0
```

## 🚀 Quick Start Commands

### For Development:
```bash
git checkout develop
git pull origin develop
# Make changes
git add .
git commit -m "feat: description of changes"
git push origin develop
```

### For Production Deployment:
```bash
# Merge develop to production
git checkout production
git pull origin production
git merge develop
git push origin production

# Windows server will auto-update via Git
```

### For Hotfixes:
```bash
git checkout production
git checkout -b hotfix/issue-name
# Make fix
git add .
git commit -m "fix: description"
git checkout production
git merge hotfix/issue-name
git push origin production
```

## 📋 Next Steps

1. **Commit current changes**: Run the commands in section 1
2. **Set up production branch**: Follow section 2
3. **Deploy to Windows**: Use section 3 scripts
4. **Implement workflow**: Follow section 4 processes
5. **Add security**: Implement section 5 measures

This Git implementation ensures:
- ✅ Safe deployments with rollback capability
- ✅ Data preservation during updates  
- ✅ Automated deployment pipeline
- ✅ Branch protection and code quality
- ✅ Production-ready versioning system