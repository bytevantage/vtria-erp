# 📋 VTRIA ERP - Windows Transfer Checklist

## Before Transfer (Source System)
- [ ] Stop any running containers: `docker-compose down`
- [ ] Ensure all files are saved and committed
- [ ] Verify `docker-compose.windows.yml` exists
- [ ] Check `deploy-windows.ps1` and `deploy-windows.bat` exist
- [ ] Note current database passwords/secrets

## Transfer Options (Choose One)

### Option A: USB/External Drive
- [ ] Copy entire `vtria-erp` folder to USB drive
- [ ] Connect USB to Windows system
- [ ] Copy to `C:\vtria-erp\`

### Option B: Network Share
- [ ] Set up network share on source system
- [ ] Map network drive on Windows
- [ ] Copy folder to `C:\vtria-erp\`

### Option C: Cloud Storage
- [ ] ZIP the entire `vtria-erp` folder
- [ ] Upload to cloud (OneDrive, Google Drive, etc.)
- [ ] Download on Windows system
- [ ] Extract to `C:\vtria-erp\`

### Option D: Git Repository (Best for Updates)
- [ ] Push all changes to Git repository
- [ ] On Windows: `git clone <repo-url> C:\vtria-erp`

## After Transfer (Windows System)

### Install Prerequisites
- [ ] Install Docker Desktop for Windows
- [ ] Enable WSL2 if prompted
- [ ] Restart Windows if required
- [ ] Verify Docker: `docker --version`

### Setup Application
- [ ] Open PowerShell **as Administrator**
- [ ] Navigate to folder: `cd C:\vtria-erp`
- [ ] Create directories: 
  ```powershell
  New-Item -ItemType Directory -Path "logs" -Force
  New-Item -ItemType Directory -Path "uploads" -Force
  New-Item -ItemType Directory -Path "backups" -Force
  ```
- [ ] Set execution policy: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Configure Security (Optional)
- [ ] Edit `.env.production` with secure passwords
- [ ] Update `JWT_SECRET` in `docker-compose.windows.yml`
- [ ] Change database passwords if needed

### Deploy Application
- [ ] Run deployment: `.\deploy-windows.ps1`
- [ ] Wait for completion (10-15 minutes)
- [ ] Check services: `docker ps`

## Verification Tests
- [ ] API Health: http://localhost:3001/health (should return `{"status":"OK"}`)
- [ ] Frontend: http://localhost:3000 (should show login page)
- [ ] Login Test: admin@vtria.com / Admin123!
- [ ] Database Test: Can create/view data

## Post-Deployment
- [ ] Change default admin password
- [ ] Configure Windows Firewall (ports 3000, 3001)
- [ ] Set up automated backups
- [ ] Document Windows-specific configurations
- [ ] Test application functionality

## Quick Commands Reference

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
docker-compose -f docker-compose.windows.yml logs
```

### Restart Services
```cmd
docker-compose -f docker-compose.windows.yml restart
```

### Database Backup
```cmd
docker exec vtria-erp-db mysqldump -u vtria_user -pSecurePassword123! vtria_erp > backup.sql
```

## Emergency Contacts & Documentation
- [ ] Save this checklist for future reference
- [ ] Note down admin credentials safely
- [ ] Document any custom Windows configurations
- [ ] Keep backup of working configuration

---

## ⚡ Quick Summary
1. **Copy** entire `vtria-erp` folder → `C:\vtria-erp\`
2. **Install** Docker Desktop for Windows
3. **Run** PowerShell as Administrator
4. **Execute** `.\deploy-windows.ps1`
5. **Access** http://localhost:3000

**Total Time**: 20-30 minutes including Docker installation!