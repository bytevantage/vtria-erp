# VTRIA ERP - Simple Folder Copy Migration to Windows

## 🎯 The Simplest Way: Just Copy Everything!

Yes! You can absolutely copy the entire project folder from your MacBook to Windows. This is much simpler than the complex setup I provided earlier.

---

## 📋 Simple Migration Steps

### Step 1: Copy the Project Folder

**Option A: External Drive**
1. Connect an external USB drive to your MacBook
2. Copy the entire folder: `/Users/srbhandary/Documents/Projects/vtria-erp`
3. Safely eject the drive and connect to Windows
4. Copy to: `C:\Projects\vtria-erp`

**Option B: Network Transfer**
1. Enable file sharing on both computers
2. Copy via network share or cloud storage (Dropbox, Google Drive, etc.)

**Option C: Git Repository**
1. Push everything to GitHub/GitLab
2. Clone on Windows: `git clone <your-repo-url>`

---

## 🗄️ Database Setup (Fresh Start)

Since you're moving to a new machine, you'll create a fresh database on Windows:

### MySQL Setup on Windows

```powershell
# 1. Install MySQL 8.0+ from mysql.com
# 2. Start MySQL service
# 3. Create database

mysql -u root -p

# In MySQL console:
CREATE DATABASE vtria_erp;
CREATE USER 'vtria_user'@'localhost' IDENTIFIED BY 'vtria_password';
GRANT ALL PRIVILEGES ON vtria_erp.* TO 'vtria_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### PostgreSQL Setup on Windows (Alternative)

```powershell
# 1. Install PostgreSQL 14+ from postgresql.org
# 2. Create database

psql -U postgres

# In PostgreSQL console:
CREATE DATABASE vtria_erp;
CREATE USER vtria_user WITH PASSWORD 'vtria_password';
GRANT ALL PRIVILEGES ON DATABASE vtria_erp TO vtria_user;
\q
```

---

## 🔧 Quick Windows Setup

### Step 1: Install Prerequisites

**Required Software:**
- ✅ [Node.js 18+ LTS](https://nodejs.org/) - Download and install
- ✅ [Git for Windows](https://gitforwindows.org/) - Download and install  
- ✅ [Docker Desktop](https://www.docker.com/products/docker-desktop/) - Download and install
- ✅ [MySQL 8.0+](https://dev.mysql.com/downloads/mysql/) OR [PostgreSQL 14+](https://www.postgresql.org/download/windows/)

**Verify Installations:**
```powershell
node --version
npm --version
git --version
docker --version
mysql --version  # or psql --version
```

### Step 2: Copy and Prepare Project

```powershell
# 1. Copy project to Windows
# From: /Users/srbhandary/Documents/Projects/vtria-erp (MacBook)
# To: C:\Projects\vtria-erp (Windows)

# 2. Navigate to project
cd C:\Projects\vtria-erp

# 3. Clean and reinstall dependencies
# Remove old node_modules (Mac-specific binaries)
rmdir /s /q node_modules
rmdir /s /q api\node_modules
rmdir /s /q client\node_modules

# 4. Install fresh dependencies
npm install
cd api && npm install && cd ..
cd client && npm install && cd ..
```

### Step 3: Configure Environment

```powershell
# 1. Copy environment files
cd C:\Projects\vtria-erp
copy api\.env.example api\.env
copy client\.env.example client\.env

# 2. Edit API environment (api\.env)
notepad api\.env
```

**Update api\.env for Windows:**
```env
PORT=3002
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=vtria_user
DB_PASS=vtria_password
DB_NAME=vtria_erp
UPLOAD_PATH=C:\\Projects\\vtria-erp\\uploads
LOG_PATH=C:\\Projects\\vtria-erp\\logs
```

**Update client\.env for Windows:**
```env
REACT_APP_API_URL=http://localhost:3002
REACT_APP_NAME=VTRIA ERP System
```

### Step 4: Setup Database Schema

```powershell
# 1. Navigate to API directory
cd C:\Projects\vtria-erp\api

# 2. Run database migrations (if using Sequelize)
npx sequelize-cli db:migrate

# 3. Seed initial data
npx sequelize-cli db:seed:all

# Alternative: Run SQL files directly
mysql -u vtria_user -p vtria_erp < ../sql/combined_database_setup.sql
```

---

## 🚀 Start the Application

### Option A: Docker (Recommended)

```powershell
cd C:\Projects\vtria-erp

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Option B: Manual Start

**Terminal 1 - Start Database:**
```powershell
# MySQL
net start MySQL80

# OR PostgreSQL
# PostgreSQL service should start automatically
```

**Terminal 2 - Start API Server:**
```powershell
cd C:\Projects\vtria-erp\api
npm run dev
```

**Terminal 3 - Start Frontend:**
```powershell
cd C:\Projects\vtria-erp\client
npm start
```

---

## ✅ Verify Everything Works

**Test URLs:**
- ✅ Frontend: http://localhost:3000
- ✅ API: http://localhost:3002/health
- ✅ API Docs: http://localhost:3002/api-docs

**Test Database Connection:**
```powershell
# MySQL
mysql -u vtria_user -p vtria_erp -e "SELECT COUNT(*) FROM users;"

# PostgreSQL
psql -U vtria_user -d vtria_erp -c "SELECT COUNT(*) FROM users;"
```

---

## 🔄 Sync Changes from MacBook

### Method 1: Git Sync (Recommended)

```bash
# On MacBook - After making changes
cd /Users/srbhandary/Documents/Projects/vtria-erp
git add .
git commit -m "Updated feature"
git push

# On Windows - Pull changes
cd C:\Projects\vtria-erp
git pull

# Restart services
docker-compose restart
```

### Method 2: File Copy

```bash
# On MacBook - Copy changed files
cp -r /Users/srbhandary/Documents/Projects/vtria-erp /Volumes/USB-DRIVE/

# On Windows - Replace files
# Copy from USB drive to C:\Projects\vtria-erp
# Restart services
```

---

## 🛠️ Troubleshooting

### Common Issues:

**1. Node Modules Issues:**
```powershell
# Clean and reinstall
cd C:\Projects\vtria-erp
rmdir /s /q node_modules
rmdir /s /q api\node_modules
rmdir /s /q client\node_modules
npm install
cd api && npm install && cd ..
cd client && npm install && cd ..
```

**2. Port Conflicts:**
```powershell
# Check what's using ports
netstat -ano | findstr :3000
netstat -ano | findstr :3002

# Kill process
taskkill /PID <PID> /F
```

**3. Docker Issues:**
```powershell
# Restart Docker Desktop
# Or reset Docker
docker system prune -a
docker-compose down
docker-compose up -d
```

**4. Database Connection Issues:**
```powershell
# Test MySQL connection
mysql -u vtria_user -p -e "SELECT 1;"

# Check MySQL service
net start MySQL80
```

---

## 📋 What Gets Copied vs What Needs Setup

### ✅ **Copied from MacBook:**
- All source code (React, Node.js, configs)
- Database schema files
- Documentation
- Scripts and utilities
- Docker configurations
- Environment templates

### 🔧 **Needs Setup on Windows:**
- Node modules (reinstall due to platform differences)
- Database (fresh installation)
- Environment variables (Windows paths)
- Docker containers (rebuild for Windows)
- System services (MySQL/PostgreSQL)

### 🎯 **Data Migration (Optional):**
If you want to migrate existing data:

```bash
# On MacBook - Export data
mysqldump -u root -p vtria_erp > vtria_erp_backup.sql

# On Windows - Import data
mysql -u vtria_user -p vtria_erp < vtria_erp_backup.sql
```

---

## 🎉 Summary

**Yes, copying the entire folder is the simplest approach!** Here's what you do:

1. **Copy** the entire `/Users/srbhandary/Documents/Projects/vtria-erp` folder to Windows
2. **Install** Node.js, Git, Docker, and MySQL/PostgreSQL on Windows
3. **Reinstall** dependencies: `npm install` in project root, api/, and client/
4. **Setup** database and update environment files
5. **Start** with `docker-compose up -d`

**That's it!** Much simpler than the complex migration setup. The database will be fresh on Windows, but you can optionally migrate data if needed.

**Ready to copy? 🚀**