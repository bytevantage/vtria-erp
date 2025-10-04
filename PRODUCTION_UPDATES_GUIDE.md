# 🔄 VTRIA ERP - Production Updates & Database Migration Guide

## 📊 Database Persistence Explained

### ✅ Your Data is SAFE!
The database uses **Docker named volumes**, which means:
- **Database data** lives in: `mysql_data` volume (persists outside your folder)
- **Application code** lives in: `C:\vtria-erp\` folder (can be replaced)
- **User uploads** live in: `./uploads` folder (backup before updating)
- **Logs** live in: `./logs` folder (backup if needed)

```
Database Storage Architecture:
┌─────────────────────┐  ┌──────────────────────┐
│   Application       │  │    Docker Volume     │
│   C:\vtria-erp\     │  │                      │
│   ├── api/          │  │  mysql_data          │
│   ├── client/       │  │  ├── table_data      │ ← PERSISTS
│   └── docker-       │  │  ├── indexes         │ ← PERSISTS  
│       compose.yml   │  │  └── configurations  │ ← PERSISTS
└─────────────────────┘  └──────────────────────┘
     ↑ Can be replaced        ↑ Always preserved
```

## 🚀 Production Update Strategies

### Strategy 1: Safe Folder Replacement (Recommended)
```powershell
# 1. Create backup
.\backup-before-update.ps1

# 2. Stop services
docker-compose -f docker-compose.windows.yml down

# 3. Backup current folder
Copy-Item "C:\vtria-erp" "C:\vtria-erp-backup-$(Get-Date -Format 'yyyyMMdd-HHmm')" -Recurse

# 4. Replace application files (keep database volume)
# Copy new vtria-erp folder content
Copy-Item "new-vtria-erp\*" "C:\vtria-erp\" -Recurse -Force

# 5. Run database migrations (if any)
.\run-migrations.ps1

# 6. Start services
docker-compose -f docker-compose.windows.yml up -d
```

### Strategy 2: Git-Based Updates (Best Practice)
```powershell
# Initial setup (one time)
cd C:\vtria-erp
git init
git remote add origin <your-repo-url>

# For updates
git pull origin main
docker-compose -f docker-compose.windows.yml down
docker-compose -f docker-compose.windows.yml build --no-cache
docker-compose -f docker-compose.windows.yml up -d
```

### Strategy 3: Rolling Updates (Zero Downtime)
```powershell
# Blue-green deployment approach
# Keep old version running while deploying new
```

## 📋 Update Checklist & Scripts

### Pre-Update Backup Script
```powershell
# backup-before-update.ps1
Write-Host "🔄 Creating Pre-Update Backup..." -ForegroundColor Blue

$BackupDate = Get-Date -Format "yyyyMMdd-HHmm"
$BackupDir = "C:\vtria-erp-backups\backup-$BackupDate"

# Create backup directory
New-Item -ItemType Directory -Path $BackupDir -Force

# Backup database
Write-Host "📊 Backing up database..." -ForegroundColor Green
docker exec vtria-erp-db mysqldump -u vtria_user -pSecurePassword123! vtria_erp > "$BackupDir\database-backup.sql"

# Backup uploads
Write-Host "📁 Backing up uploads..." -ForegroundColor Green
Copy-Item "C:\vtria-erp\uploads" "$BackupDir\uploads" -Recurse -Force

# Backup configuration
Write-Host "⚙️ Backing up configuration..." -ForegroundColor Green
Copy-Item "C:\vtria-erp\docker-compose.windows.yml" "$BackupDir\"
Copy-Item "C:\vtria-erp\.env.production" "$BackupDir\" -ErrorAction SilentlyContinue

Write-Host "✅ Backup completed: $BackupDir" -ForegroundColor Green
```

### Database Migration Script
```powershell
# run-migrations.ps1
Write-Host "🔄 Running Database Migrations..." -ForegroundColor Blue

# Check if migration files exist
if (Test-Path "C:\vtria-erp\sql\migrations\*.sql") {
    Write-Host "📊 Found migration files, executing..." -ForegroundColor Green
    
    Get-ChildItem "C:\vtria-erp\sql\migrations\*.sql" | Sort-Object Name | ForEach-Object {
        Write-Host "  Executing: $($_.Name)" -ForegroundColor Gray
        Get-Content $_.FullName | docker exec -i vtria-erp-db mysql -u vtria_user -pSecurePassword123! vtria_erp
    }
    
    Write-Host "✅ Migrations completed" -ForegroundColor Green
} else {
    Write-Host "ℹ️ No migrations found" -ForegroundColor Yellow
}
```

## 🛡️ Safe Update Process

### 1. Pre-Update Checklist
- [ ] **Backup database**: `.\backup-before-update.ps1`
- [ ] **Note current version**: Check VERSION file or git commit
- [ ] **Test new version**: In development environment first
- [ ] **Schedule downtime**: Inform users if needed
- [ ] **Verify disk space**: Ensure enough space for backups

### 2. Update Process
```powershell
# Navigate to application directory
cd C:\vtria-erp

# Create comprehensive backup
.\backup-before-update.ps1

# Stop services gracefully
docker-compose -f docker-compose.windows.yml down

# Option A: Git Update (Recommended)
git pull origin main

# Option B: Folder Replacement
# Replace folder contents (excluding .git, uploads, logs)

# Run any database migrations
.\run-migrations.ps1

# Rebuild containers (if code changes)
docker-compose -f docker-compose.windows.yml build --no-cache

# Start services
docker-compose -f docker-compose.windows.yml up -d

# Verify deployment
.\verify-deployment.ps1
```

### 3. Post-Update Verification
```powershell
# verify-deployment.ps1
Write-Host "🔍 Verifying Deployment..." -ForegroundColor Blue

# Check service status
$services = docker-compose -f docker-compose.windows.yml ps --services
Write-Host "📊 Services: $services" -ForegroundColor Green

# Test API health
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health"
    Write-Host "✅ API Health: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ API Health Check Failed" -ForegroundColor Red
}

# Test frontend
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
    Write-Host "✅ Frontend: Accessible (Status: $($frontend.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend Check Failed" -ForegroundColor Red
}

# Test database connection
try {
    $dbTest = docker exec vtria-erp-db mysql -u vtria_user -pSecurePassword123! -e "SELECT 1" vtria_erp
    Write-Host "✅ Database: Connected" -ForegroundColor Green
} catch {
    Write-Host "❌ Database Check Failed" -ForegroundColor Red
}

Write-Host "🎉 Verification Complete" -ForegroundColor Blue
```

## 📊 Database Schema Changes

### Handling Schema Updates
When the new version includes database changes:

#### 1. Migration Files Approach
```
C:\vtria-erp\sql\migrations\
├── 001_initial_schema.sql
├── 002_add_user_preferences.sql
├── 003_add_notification_system.sql
└── 004_update_pricing_structure.sql
```

#### 2. Version-Safe Migrations
```sql
-- Example migration: 004_update_pricing_structure.sql
-- Add column only if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'vtria_erp' 
  AND TABLE_NAME = 'estimations' 
  AND COLUMN_NAME = 'discount_type';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE estimations ADD COLUMN discount_type ENUM("percentage", "fixed") DEFAULT "percentage"', 
    'SELECT "Column already exists" as result');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

#### 3. Rollback Strategy
```powershell
# rollback-to-previous.ps1
$BackupDir = Get-ChildItem "C:\vtria-erp-backups\" | Sort-Object Name -Descending | Select-Object -First 1

Write-Host "🔄 Rolling back to: $($BackupDir.Name)" -ForegroundColor Yellow

# Stop current services
docker-compose -f docker-compose.windows.yml down

# Restore database
docker exec -i vtria-erp-db mysql -u vtria_user -pSecurePassword123! vtria_erp < "$($BackupDir.FullName)\database-backup.sql"

# Restore configuration
Copy-Item "$($BackupDir.FullName)\docker-compose.windows.yml" "C:\vtria-erp\"
Copy-Item "$($BackupDir.FullName)\.env.production" "C:\vtria-erp\" -ErrorAction SilentlyContinue

# Start services
docker-compose -f docker-compose.windows.yml up -d
```

## 🎯 Best Practices for Production Updates

### 1. **Always Use Git** (Recommended)
```powershell
# Initial setup
git clone <your-repo> C:\vtria-erp
cd C:\vtria-erp

# For updates
git fetch origin
git checkout main
git pull origin main
```

### 2. **Staging Environment**
- Test updates on identical staging server first
- Validate migrations on copy of production data
- Verify all functionality before production deployment

### 3. **Maintenance Windows**
- Schedule updates during low-usage periods
- Notify users of planned downtime
- Have rollback plan ready

### 4. **Automated Backups**
```powershell
# Schedule daily backups via Windows Task Scheduler
# Task: Run backup-before-update.ps1 daily at 2 AM
```

## 🚨 Emergency Procedures

### Quick Rollback (5 minutes)
```powershell
# Emergency rollback
cd C:\vtria-erp
docker-compose -f docker-compose.windows.yml down
# Restore from last backup
.\rollback-to-previous.ps1
# Verify services
.\verify-deployment.ps1
```

### Data Recovery
```powershell
# If database corruption occurs
docker run --rm -v mysql_data:/backup-source -v C:\emergency-backup:/backup alpine tar czf /backup/mysql-recovery.tar.gz -C /backup-source .
```

## 📈 Update Frequency Recommendations

### **Critical Security Updates**: Immediately
### **Bug Fixes**: Weekly maintenance window  
### **Feature Updates**: Monthly planned deployment
### **Major Versions**: Quarterly with extensive testing

---

## 💡 Key Takeaways

✅ **Database data persists** through Docker volumes
✅ **Application updates don't affect existing data**  
✅ **Always backup before updates**
✅ **Use Git for version control**
✅ **Test migrations in staging first**
✅ **Have rollback procedures ready**

**Your production data is safe with proper update procedures!** 🛡️