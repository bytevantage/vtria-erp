# ⚠️ CRITICAL: Docker Data Persistence vs Code Overwrite Analysis

## 🚨 YOUR CONCERN IS VALID!

When you overwrite the `vtria-erp` folder, here's EXACTLY what happens:

### ❌ WHAT GETS DESTROYED:
```
C:\vtria-erp\
├── 🔴 api/ (ALL APPLICATION CODE - OVERWRITTEN)
├── 🔴 client/ (ALL FRONTEND CODE - OVERWRITTEN) 
├── 🔴 sql/schema/ (DATABASE SETUP SCRIPTS - OVERWRITTEN)
├── 🔴 docker-compose.yml (DOCKER CONFIG - OVERWRITTEN)
├── 🟡 uploads/ (USER FILES - OVERWRITTEN IF NOT PRESERVED)
└── 🟡 logs/ (APPLICATION LOGS - OVERWRITTEN IF NOT PRESERVED)
```

### ✅ WHAT SURVIVES:
```
Docker Volume System:
├── 🟢 mysql_data (DATABASE DATA - ALWAYS SAFE)
│   ├── users table ← ALL USER ACCOUNTS SAFE
│   ├── clients table ← ALL CLIENT DATA SAFE  
│   ├── estimations table ← ALL ESTIMATES SAFE
│   ├── quotations table ← ALL QUOTATIONS SAFE
│   └── All other tables ← ALL DATA SAFE
```

## 🎯 The Key Understanding:

### When you run `docker-compose up`:
1. **NEW containers** are built from your code
2. **EXISTING database volume** is mounted (data preserved)
3. **Database schema changes** only apply to NEW databases
4. **Existing data** remains untouched

### ⚠️ BUT THERE ARE RISKS:

#### Risk 1: Database Schema Conflicts
```
OLD SCHEMA: estimations table has 15 columns
NEW SCHEMA: estimations table expects 18 columns
RESULT: 💥 Application may crash or behave unexpectedly
```

#### Risk 2: Configuration Changes
```
OLD CONFIG: Different JWT secrets, database passwords
NEW CONFIG: New secrets, different passwords  
RESULT: 💥 Authentication failures, database connection errors
```

#### Risk 3: User Uploads Loss
```
OLD: C:\vtria-erp\uploads\ (contains user files)
NEW: Overwritten folder with empty uploads/
RESULT: 💥 All user-uploaded files lost
```

## 🛡️ PRODUCTION-SAFE UPDATE PROCEDURE

### Method 1: Selective Code Update (SAFEST)
```powershell
# 1. Backup everything first
.\backup-before-update.ps1

# 2. Stop services
docker-compose -f docker-compose.windows.yml down

# 3. Preserve critical data directories
Copy-Item "C:\vtria-erp\uploads" "C:\temp\uploads-backup" -Recurse -Force
Copy-Item "C:\vtria-erp\logs" "C:\temp\logs-backup" -Recurse -Force
Copy-Item "C:\vtria-erp\.env.production" "C:\temp\env-backup" -Force

# 4. Update only application code
Copy-Item "new-version\api" "C:\vtria-erp\api" -Recurse -Force
Copy-Item "new-version\client" "C:\vtria-erp\client" -Recurse -Force

# 5. Restore preserved data
Copy-Item "C:\temp\uploads-backup\*" "C:\vtria-erp\uploads\" -Recurse -Force
Copy-Item "C:\temp\logs-backup\*" "C:\vtria-erp\logs\" -Recurse -Force
Copy-Item "C:\temp\env-backup" "C:\vtria-erp\.env.production" -Force

# 6. Run migrations for schema changes
.\run-migrations.ps1

# 7. Start services
docker-compose -f docker-compose.windows.yml up -d
```

### Method 2: Git-Based Updates (BEST PRACTICE)
```powershell
# Initial setup (ONE TIME ONLY)
cd C:\vtria-erp
git init
git remote add origin <your-repository-url>
git pull origin main

# For all future updates (SAFE)
git pull origin main
docker-compose -f docker-compose.windows.yml down
docker-compose -f docker-compose.windows.yml build --no-cache  
docker-compose -f docker-compose.windows.yml up -d
```

## 📊 Database Schema Evolution Strategy

### Problem: Schema Changes Break Existing Data
```sql
-- OLD VERSION: estimations table
CREATE TABLE estimations (
    id INT PRIMARY KEY,
    estimation_id VARCHAR(50),
    total_amount DECIMAL(10,2)
);

-- NEW VERSION: estimations table  
CREATE TABLE estimations (
    id INT PRIMARY KEY,
    estimation_id VARCHAR(50),
    total_amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2),    -- NEW COLUMN
    discount_type ENUM('fixed','percent') -- NEW COLUMN
);
```

### Solution: Migration Scripts
```sql
-- Migration: 002_add_tax_and_discount.sql
-- Add new columns safely to existing table

-- Add tax_amount if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'vtria_erp' AND TABLE_NAME = 'estimations' AND COLUMN_NAME = 'tax_amount');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE estimations ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0.00', 
    'SELECT "tax_amount column already exists" as result');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add discount_type if it doesn't exist  
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'vtria_erp' AND TABLE_NAME = 'estimations' AND COLUMN_NAME = 'discount_type');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE estimations ADD COLUMN discount_type ENUM("fixed","percent") DEFAULT "percent"', 
    'SELECT "discount_type column already exists" as result');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

## 🎯 RECOMMENDED PRODUCTION WORKFLOW

### Step 1: Pre-Update Assessment
```powershell
# Check current database schema version
docker exec vtria-erp-db mysql -u vtria_user -pSecurePassword123! -e "DESCRIBE estimations" vtria_erp

# Check existing data volume  
docker volume inspect mysql_data

# Count existing records
docker exec vtria-erp-db mysql -u vtria_user -pSecurePassword123! -e "
SELECT 
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM clients) as clients_count, 
  (SELECT COUNT(*) FROM estimations) as estimations_count,
  (SELECT COUNT(*) FROM quotations) as quotations_count
" vtria_erp
```

### Step 2: Create Comprehensive Backup
```powershell
# Enhanced backup including everything
$BackupDate = Get-Date -Format "yyyyMMdd-HHmm"

# Database backup
docker exec vtria-erp-db mysqldump -u vtria_user -pSecurePassword123! --routines --triggers vtria_erp > "backup-$BackupDate.sql"

# Data directories backup
Copy-Item "C:\vtria-erp\uploads" "C:\backups\uploads-$BackupDate" -Recurse -Force
Copy-Item "C:\vtria-erp\logs" "C:\backups\logs-$BackupDate" -Recurse -Force

# Configuration backup  
Copy-Item "C:\vtria-erp\docker-compose.windows.yml" "C:\backups\config-$BackupDate\"
Copy-Item "C:\vtria-erp\.env.production" "C:\backups\config-$BackupDate\" -ErrorAction SilentlyContinue
```

### Step 3: Safe Update Process
```powershell
# Use the enhanced safe update script
.\enhanced-safe-update.ps1 -PreserveUserData -RunMigrations -VerifyData
```

Let me create this enhanced script: