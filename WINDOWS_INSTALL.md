# VTRIA ERP - Windows Server Installation Guide

## Overview

This guide walks you through installing VTRIA ERP on a Windows Server with Docker Desktop. The installation supports both demo and production versions.

## 🚀 Quick Start

### Prerequisites

**Windows Server Requirements:**
- Windows Server 2019 or later
- Minimum 8GB RAM (16GB recommended)
- 50GB free disk space
- Administrator privileges
- Internet connection

**Required Software:**
1. **Docker Desktop for Windows** - [Download here](https://www.docker.com/products/docker-desktop)
2. **PowerShell 5.1+** (included with Windows Server)
3. **Git for Windows** - [Download here](https://git-scm.com/download/win)

## 📋 Installation Steps

### 1. Install Docker Desktop

1. Download Docker Desktop for Windows
2. Run the installer as Administrator
3. Restart your computer when prompted
4. Start Docker Desktop from the Start menu
5. Wait for Docker to start (green icon in system tray)

**Verify Docker installation:**
```powershell
docker --version
docker-compose --version
```

### 2. Download VTRIA ERP

```powershell
# Clone the repository
git clone https://github.com/bytevantage/vtria-erp.git C:\vtria-erp

# Navigate to the project directory
cd C:\vtria-erp
```

### 3. Choose Installation Type

#### Option A: Demo Version (Quick Start)
Perfect for testing, demonstrations, and evaluation.

```powershell
# Run the demo deployment script
.\scripts\deploy-demo-windows.ps1
```

#### Option B: Production Version
For live client deployments with full security.

```powershell
# Run the production deployment script
.\scripts\deploy-production-windows.ps1
```

## 🔧 Demo Installation Details

### What Gets Installed

**Services:**
- VTRIA ERP Application (Node.js)
- MySQL Database (Port 3306)
- Redis Cache (Port 6379)

**Default Ports:**
- Application: http://localhost:3000
- Database: localhost:3306
- Redis: localhost:6379

### Default Login Credentials

```
Email: demo@vtria.com
Password: Demo@123456
```

### Demo Features

- ✅ Sample data pre-loaded
- ✅ 2-hour session timeout
- ✅ Max 5 concurrent users
- ✅ Auto-reset capability
- ✅ No sensitive data
- ✅ Quick deployment (5-10 minutes)

## 🏢 Production Installation Details

### Additional Requirements

**SSL Certificate:**
- Self-signed certificates can be generated
- Or provide your own SSL certificates

**Environment Configuration:**
- Database passwords
- JWT secrets
- Email settings
- Backup configurations

### Production Features

- ✅ SSL/TLS encryption
- ✅ Two-factor authentication
- ✅ Audit logging
- ✅ Rate limiting
- ✅ Automated backups
- ✅ Monitoring and health checks
- ✅ Scalable architecture

## 📁 Directory Structure

After installation, your directory will look like:

```
C:\vtria-erp-demo\
├── docker-compose.yml          # Docker configuration
├── .env                         # Environment variables
├── logs\                        # Application logs
├── data\                        # Application data
├── sql\                         # Database scripts
└── backups\                     # Backup files
```

## 🔄 Management Commands

### Daily Operations

```powershell
# Navigate to installation directory
cd C:\vtria-erp-demo

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Restart services
docker-compose restart

# Update application
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Database Management

```powershell
# Access MySQL database
docker exec -it vtria-erp-db mysql -u root -p

# Create backup
docker exec vtria-erp-db mysqldump -u root -p --all-databases > backup.sql

# Restore backup
docker exec -i vtria-erp-db mysql -u root -p < backup.sql
```

## 🔒 Security Configuration

### Demo Version Security

The demo version uses default credentials for easy testing:

```powershell
# Default passwords (change if needed)
DB_PASSWORD=demo123456
JWT_SECRET=demo-jwt-secret-key
SESSION_SECRET=demo-session-secret
```

### Production Version Security

For production, always change default passwords:

1. Edit `.env` file:
```powershell
notepad .env
```

2. Update these values:
```
DB_PASSWORD=YourSecurePassword123!
JWT_SECRET=YourJWTSecretKey32CharsLong
SESSION_SECRET=YourSessionSecret32CharsLong
```

3. Restart services:
```powershell
docker-compose down
docker-compose up -d
```

## 🌐 Network Configuration

### Firewall Settings

Open these ports in Windows Firewall:

```powershell
# Allow HTTP (for demo)
New-NetFirewallRule -DisplayName "VTRIA ERP HTTP" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Allow HTTPS (for production)
New-NetFirewallRule -DisplayName "VTRIA ERP HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Allow MySQL (if external access needed)
New-NetFirewallRule -DisplayName "VTRIA ERP MySQL" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Allow
```

### Access from Other Computers

To access VTRIA ERP from other computers on the network:

1. Find your server's IP address:
```powershell
ipconfig
```

2. Access via browser:
```
http://[SERVER_IP]:3000
```

## 📊 Monitoring and Troubleshooting

### Health Checks

```powershell
# Check application health
curl http://localhost:3000/health

# Check container status
docker ps

# Check resource usage
docker stats
```

### Common Issues

**"Port already in use"**
```powershell
# Find what's using the port
netstat -ano | findstr :3000

# Kill the process
taskkill /PID [PROCESS_ID] /F

# Or use different ports
.\scripts\deploy-demo-windows.ps1 -HttpPort 8080
```

**"Docker not running"**
- Start Docker Desktop from Start menu
- Check if Docker service is running: `Get-Service docker`

**"Out of memory"**
- Increase Docker memory allocation in Docker Desktop settings
- Recommended: 8GB RAM for Docker

**"Database connection failed"**
```powershell
# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db

# Check database status
docker exec vtria-erp-db mysqladmin ping -h localhost
```

## 🔄 Updates and Maintenance

### Update Application

```powershell
cd C:\vtria-erp-demo

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Scheduled Maintenance

Create a scheduled task for regular maintenance:

```powershell
# Create PowerShell script for maintenance
notepad C:\scripts\vtria-maintenance.ps1
```

Content:
```powershell
cd C:\vtria-erp-demo

# Create backup
docker exec vtria-erp-db mysqldump -u root -pdemo123456 --all-databases > "C:\backups\vtria-$(Get-Date -Format 'yyyyMMdd').sql"

# Clean old logs
Get-ChildItem C:\vtria-erp-demo\logs\*.log | Where-Object LastWriteTime -LT (Get-Date).AddDays(-7) | Remove-Item

# Restart services weekly
docker-compose restart
```

## 📞 Support

### Get Help

1. **Check logs**: `docker-compose logs -f`
2. **Verify status**: `docker-compose ps`
3. **Review documentation**: Check `MANAGEMENT.md` in the project
4. **Contact support**: srbhandary@bytevantage.in

### Useful Commands

```powershell
# Show all containers
docker ps -a

# Show disk usage
docker system df

# Clean up unused images
docker system prune -f

# Access application container
docker exec -it vtria-erp-demo powershell
```

## 🎯 Next Steps

1. **Test the demo version** first to ensure everything works
2. **Configure firewall** for network access
3. **Set up monitoring** and alerts
4. **Plan backup strategy** for production use
5. **Review security settings** before going live
6. **Train users** on the system

---

## 🚀 Production Deployment

When ready for production:

1. Use the production deployment script
2. Configure SSL certificates
3. Set up proper domain names
4. Configure external database if needed
5. Set up monitoring and alerting
6. Test backup and recovery procedures

The Windows installation provides the same robust features as the Linux version with Windows-specific management tools and PowerShell automation.
