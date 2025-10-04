# VTRIA ERP - Windows Server Deployment Guide

## 🪟 Windows Server Requirements

### Prerequisites
- **Windows Server 2019/2022** or **Windows 10/11 Pro**
- **Docker Desktop for Windows** (with WSL2 enabled)
- **PowerShell 5.1+** or **PowerShell Core 7+**
- **Administrator privileges**
- **4GB RAM minimum** (8GB recommended)
- **20GB free disk space minimum**

## 🚀 Quick Deployment

### ✅ EASIEST METHOD: Complete Folder Transfer
1. **Copy entire `vtria-erp` folder to Windows**: `C:\vtria-erp\`
2. **Open PowerShell as Administrator**
3. **Navigate to folder**: `cd C:\vtria-erp`  
4. **Run deployment**: `.\deploy-windows.ps1`

### Alternative Methods:

#### Option 1: PowerShell Script
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy-windows.ps1
```

#### Option 2: Batch File
```cmd
REM Right-click and "Run as Administrator"
deploy-windows.bat
```

#### Option 3: Manual Docker Compose
```cmd
docker-compose -f docker-compose.windows.yml up -d
```

## 📋 Pre-Deployment Setup

### 1. Install Docker Desktop
1. Download from: https://www.docker.com/products/docker-desktop
2. Install with WSL2 backend enabled
3. Restart Windows after installation
4. Verify: `docker --version` and `docker-compose --version`

### 2. Configure Environment
1. Copy `.env.windows` to `.env.production`
2. Edit `.env.production` with your production values:
   ```env
   # CRITICAL: Change these values!
   DB_PASS=YourSecurePassword123!
   DB_ROOT_PASSWORD=YourSecureRootPassword123!
   JWT_SECRET=YourVeryLongSecure32CharacterStringForJWT
   ```

### 3. Windows Firewall Configuration
```powershell
# Allow Docker ports through Windows Firewall
New-NetFirewallRule -DisplayName "VTRIA ERP Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "VTRIA ERP API" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "VTRIA ERP Database" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Allow
```

## 🔧 Windows-Specific Configurations

### Docker Volume Mapping
The Windows docker-compose uses:
- `./logs:/var/log/vtria-erp` - Application logs
- `./uploads:/var/www/vtria-erp/uploads` - File uploads
- `mysql_data:/var/lib/mysql` - Database persistence

### Windows Paths
```cmd
# Project directory
C:\vtria-erp\

# Logs directory  
C:\vtria-erp\logs\

# Uploads directory
C:\vtria-erp\uploads\

# Backups directory
C:\vtria-erp\backups\
```

## 🛡️ Windows Security Configuration

### 1. User Account Control (UAC)
- Run deployment scripts as Administrator
- Configure Docker to run at startup

### 2. Windows Defender
Add exclusions for Docker directories:
```powershell
Add-MpPreference -ExclusionPath "C:\vtria-erp"
Add-MpPreference -ExclusionPath "C:\ProgramData\Docker"
```

### 3. Service Configuration
Create Windows service for auto-start:
```cmd
# Install Docker service to start automatically
sc config "com.docker.service" start= auto
```

## 🔄 Management Commands

### Start Services
```cmd
docker-compose -f docker-compose.windows.yml up -d
```

### Stop Services
```cmd
docker-compose -f docker-compose.windows.yml down
```

### View Logs
```cmd
# All services
docker-compose -f docker-compose.windows.yml logs

# Specific service
docker-compose -f docker-compose.windows.yml logs api
docker-compose -f docker-compose.windows.yml logs client
docker-compose -f docker-compose.windows.yml logs db
```

### Database Backup
```cmd
# Create backup
docker exec vtria-erp-db mysqldump -u vtria_user -pSecurePassword123! vtria_erp > backup_%date%.sql

# Restore backup
docker exec -i vtria-erp-db mysql -u vtria_user -pSecurePassword123! vtria_erp < backup.sql
```

### Update Application
```cmd
# Pull latest changes
git pull

# Rebuild and restart
docker-compose -f docker-compose.windows.yml down
docker-compose -f docker-compose.windows.yml build --no-cache
docker-compose -f docker-compose.windows.yml up -d
```

## 📊 Monitoring & Health Checks

### Service Status
```cmd
docker-compose -f docker-compose.windows.yml ps
```

### Health Check URLs
- **API Health**: http://localhost:3001/health
- **Frontend**: http://localhost:3000
- **Database**: Use MySQL Workbench or connect to localhost:3306

### Performance Monitoring
```powershell
# Docker stats
docker stats

# System resources
Get-Counter "\Processor(_Total)\% Processor Time"
Get-Counter "\Memory\Available MBytes"
```

## 🚨 Troubleshooting

### Common Windows Issues

#### Docker Desktop Not Starting
```cmd
# Restart Docker service
net stop "Docker Desktop Service"
net start "Docker Desktop Service"
```

#### Port Already in Use
```cmd
# Find process using port
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID 1234 /F
```

#### WSL2 Issues
```cmd
# Update WSL2
wsl --update

# Set WSL2 as default
wsl --set-default-version 2
```

#### Permission Issues
```cmd
# Fix Docker permissions
icacls "C:\vtria-erp" /grant Users:(F) /T
```

### Log Locations
- **Docker Desktop Logs**: `%APPDATA%\Docker\log\`
- **Application Logs**: `./logs/`
- **Container Logs**: Use `docker logs [container-name]`

## 🔄 Automated Startup (Windows Service)

### Create Startup Script
```cmd
# Create startup.bat
@echo off
cd C:\vtria-erp
docker-compose -f docker-compose.windows.yml up -d
```

### Schedule as Windows Task
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: "At startup"
4. Set action: Start program `startup.bat`
5. Run with highest privileges

## 📈 Production Optimizations

### Windows Server Tuning
```cmd
# Increase Docker memory limit
# Edit Docker Desktop settings: Resources > Advanced > Memory: 8GB

# Disable Windows indexing on Docker directories
fsutil behavior set DisableLastAccess 1
```

### Network Configuration
```powershell
# Configure static IP for server
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress "192.168.1.100" -PrefixLength 24 -DefaultGateway "192.168.1.1"
```

## 🎯 Post-Deployment Checklist

- [ ] Services running correctly
- [ ] Database accessible
- [ ] API health check passing
- [ ] Frontend loading
- [ ] Admin login working
- [ ] Default password changed
- [ ] Firewall rules configured
- [ ] Backups scheduled
- [ ] SSL certificate installed (if applicable)
- [ ] Monitoring set up

## 📞 Support

For Windows-specific issues:
1. Check Docker Desktop logs
2. Verify WSL2 configuration
3. Check Windows Event Viewer
4. Review firewall settings
5. Ensure sufficient system resources