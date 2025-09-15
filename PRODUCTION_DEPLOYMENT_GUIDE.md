# 🚀 VTRIA ERP Production Deployment Guide

## Table of Contents
1. [Development Environment Setup](#development-environment-setup)
2. [Code Consistency Management](#code-consistency-management)
3. [Development to Production Workflow](#development-to-production-workflow)
4. [Zero-Downtime Production Updates](#zero-downtime-production-updates)
5. [Automated Backup System](#automated-backup-system)
6. [Recovery and Rollback Procedures](#recovery-and-rollback-procedures)
7. [Production Monitoring](#production-monitoring)

---

## 🛠️ Development Environment Setup

### AI Development Tools Integration
Your development stack includes:
- **Claude Code** (Primary development assistant)
- **Windsurfer + Claude** (Web-based AI coding)
- **VS Code + GitHub Copilot + Claude Sonnet 4** (Desktop IDE)

### Ensuring Consistency Across Tools

#### 1. Project Configuration Files
Create these files in your project root to maintain consistency:

**`.vscode/settings.json`**
```json
{
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/logs": true,
    "**/.DS_Store": true
  },
  "javascript.preferences.quoteStyle": "single",
  "typescript.preferences.quoteStyle": "single"
}
```

**`.vscode/extensions.json`**
```json
{
  "recommendations": [
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-docker",
    "formulahendry.auto-rename-tag"
  ]
}
```

**`.editorconfig`**
```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[*.{js,jsx,ts,tsx,json,css,scss,html,vue}]
indent_size = 2

[*.{py,sql}]
indent_size = 4
```

**`.prettierrc`**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

**`.eslintrc.js`**
```javascript
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'prefer-const': 'error',
  },
};
```

#### 2. Development Standards Document
**`DEVELOPMENT_STANDARDS.md`**
```markdown
# VTRIA ERP Development Standards

## Code Style
- Use ES6+ features
- Prefer async/await over Promises
- Use descriptive variable names
- Comment complex business logic
- Follow REST API conventions

## Database Conventions
- Table names: snake_case
- Primary keys: id (INT AUTO_INCREMENT)
- Foreign keys: {table}_id
- Timestamps: created_at, updated_at
- Soft deletes: deleted_at

## API Conventions
- RESTful endpoints
- Consistent error responses
- API versioning: /api/v1/
- Authentication via JWT
- Rate limiting enabled

## Component Structure
- One component per file
- Props validation with PropTypes
- Consistent state management
- Error boundaries implemented
```

---

## 🔄 Code Consistency Management

### Git Workflow with Multiple AI Tools

#### 1. Initialize Git Repository
```bash
cd /path/to/vtria-erp
git init
git remote add origin https://github.com/your-username/vtria-erp.git
```

#### 2. Git Hooks for Consistency
**`.git/hooks/pre-commit`**
```bash
#!/bin/sh
# Pre-commit hook for VTRIA ERP

echo "🔍 Running pre-commit checks..."

# Check for forbidden patterns
if grep -r "console.log" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" .; then
    echo "❌ console.log found. Please remove before committing."
    exit 1
fi

# Check for TODO comments
if grep -r "TODO" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" .; then
    echo "⚠️  TODO comments found. Consider addressing before production."
fi

# Run linting
npm run lint --prefix client
npm run lint --prefix api

echo "✅ Pre-commit checks passed!"
```

#### 3. Branch Strategy
```bash
# Main branches
main          # Production-ready code
develop       # Integration branch
feature/*     # Feature development
hotfix/*      # Production fixes
release/*     # Release preparation

# Example workflow
git checkout develop
git checkout -b feature/client-portal
# ... make changes with any AI tool
git add .
git commit -m "feat: add client portal authentication"
git push origin feature/client-portal
# Create pull request
```

#### 4. AI Tool Synchronization Script
**`sync-development.sh`**
```bash
#!/bin/bash
# Synchronize development environment across AI tools

echo "🔄 Synchronizing VTRIA ERP development environment..."

# Pull latest changes
git fetch origin
git merge origin/develop

# Update dependencies
echo "📦 Updating dependencies..."
cd client && npm install && cd ..
cd api && npm install && cd ..

# Run code formatting
echo "🎨 Formatting code..."
npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"

# Update documentation
echo "📚 Updating documentation..."
npx typedoc --out docs/ client/src/
npx jsdoc -d docs/api/ api/src/

# Verify build
echo "🏗️ Verifying build..."
cd client && npm run build && cd ..
cd api && npm run test && cd ..

echo "✅ Development environment synchronized!"
```

---

## 🏭 Development to Production Workflow

### Phase 1: Development Environment
```bash
# 1. Start development environment
docker-compose -f docker-compose.dev.yml up -d

# 2. Access development URLs
# Frontend: http://localhost:3000
# API: http://localhost:3001  
# Database: localhost:3306
```

### Phase 2: Staging Environment (Optional but Recommended)
**`docker-compose.staging.yml`**
```yaml
version: '3.8'

services:
  api:
    build:
      context: ./api
      target: production
    ports:
      - "4001:3001"
    environment:
      - NODE_ENV=staging
      - DB_HOST=db
      - DB_NAME=vtria_erp_staging
    depends_on:
      - db

  client:
    build:
      context: ./client
      target: production
    ports:
      - "4000:80"
    environment:
      - REACT_APP_API_URL=http://localhost:4001

  db:
    image: mysql:8.0
    ports:
      - "4306:3306"
    environment:
      - MYSQL_DATABASE=vtria_erp_staging
      - MYSQL_USER=vtria_user
      - MYSQL_PASSWORD=staging_password
    volumes:
      - staging_mysql_data:/var/lib/mysql

volumes:
  staging_mysql_data:
```

### Phase 3: Production Preparation

#### 1. Production Environment Variables
**`.env.production`**
```bash
# Production Configuration
NODE_ENV=production
PORT=3001

# Database (Secure Credentials)
DB_HOST=db
DB_PORT=3306
DB_NAME=vtria_erp_production
DB_USER=vtria_prod_user
DB_PASSWORD=SecureProductionPassword123!

# Security
JWT_SECRET=SuperSecureJWTSecretForProduction2024
JWT_EXPIRES_IN=8h

# Features
BYPASS_AUTH=false
ENABLE_DEBUG_ENDPOINTS=false
ENABLE_PERFORMANCE_MONITORING=true

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Company Information
COMPANY_NAME=VTRIA Engineering Solutions Pvt Ltd
COMPANY_ADDRESS=Mangalore, Karnataka, India
COMPANY_PHONE=+91-XXXXXXXXXX
COMPANY_EMAIL=info@vtria.com
COMPANY_GSTIN=XXXXXXXXXXXXX

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
```

#### 2. Production Docker Configuration
**`docker-compose.production.yml`**
```yaml
version: '3.8'

services:
  api:
    build:
      context: ./api
      target: production
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_USER=vtria_prod_user
      - DB_PASS=SecureProductionPassword123!
      - DB_NAME=vtria_erp_production
    volumes:
      - ./uploads:/var/www/vtria-erp/uploads
      - ./logs:/var/log/vtria-erp
      - backup_data:/backups
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy

  client:
    build:
      context: ./client
      target: production
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://your-windows-server-ip:3001
    restart: unless-stopped
    depends_on:
      - api

  db:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=RootPasswordSecure123!
      - MYSQL_DATABASE=vtria_erp_production
      - MYSQL_USER=vtria_prod_user
      - MYSQL_PASSWORD=SecureProductionPassword123!
    volumes:
      - production_mysql_data:/var/lib/mysql
      - ./sql/schema:/docker-entrypoint-initdb.d
      - backup_data:/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "vtria_prod_user", "--password=SecureProductionPassword123!"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - production_redis_data:/data
    command: redis-server --appendonly yes --requirepass RedisProductionPassword123!
    restart: unless-stopped

  backup:
    image: mysql:8.0
    depends_on:
      - db
    volumes:
      - backup_data:/backups
      - ./scripts:/scripts
    environment:
      - MYSQL_HOST=db
      - MYSQL_USER=vtria_prod_user
      - MYSQL_PASSWORD=SecureProductionPassword123!
      - MYSQL_DATABASE=vtria_erp_production
    entrypoint: ["/scripts/backup-cron.sh"]
    restart: unless-stopped

volumes:
  production_mysql_data:
  production_redis_data:
  backup_data:
```

---

## 🔄 Zero-Downtime Production Updates

### Update Process Overview
```
Development → Testing → Staging → Production Deployment
     ↓           ↓         ↓              ↓
   MacBook    CI/CD    Validation   Live Windows Server
```

### Step-by-Step Production Update

#### 1. Create Deployment Package (MacBook)
**`scripts/create-production-deployment.sh`**
```bash
#!/bin/bash

VERSION=${1:-$(cat VERSION)}
DEPLOYMENT_NAME="vtria-erp-v${VERSION}-$(date +%Y%m%d-%H%M%S)"
DEPLOYMENT_DIR="/Users/$(whoami)/Desktop/${DEPLOYMENT_NAME}"

echo "🚀 Creating Production Deployment Package"
echo "Version: $VERSION"
echo "Package: $DEPLOYMENT_NAME"
echo "=========================================="

# 1. Create deployment directory
mkdir -p "$DEPLOYMENT_DIR"
cd "$DEPLOYMENT_DIR"

# 2. Copy application files
echo "📦 Copying application files..."
rsync -av --exclude=node_modules \
          --exclude=.git \
          --exclude=.DS_Store \
          --exclude=logs/* \
          --exclude=uploads/* \
          --exclude=docs/ \
          --exclude=*.log \
          "$OLDPWD/" ./

# 3. Create production-specific files
echo "⚙️ Creating production configuration..."

# Create Windows deployment script
cat > deploy-production.bat << 'EOF'
@echo off
echo 🚀 VTRIA ERP Production Deployment Starting...
echo ================================================

REM Set variables
set BACKUP_DIR=backups\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%

echo 📊 Pre-deployment checks...
REM Check Docker is running
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Docker not running! Please start Docker Desktop.
    pause
    exit /b 1
)

REM Check current system status
echo 🔍 Checking current system status...
docker-compose ps

echo 📦 Creating backup...
mkdir "%BACKUP_DIR%" 2>nul

REM Backup database
echo 💾 Backing up database...
docker exec vtria-erp-db-1 mysqldump -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production > "%BACKUP_DIR%\database_backup.sql"
if %ERRORLEVEL% neq 0 (
    echo ❌ Database backup failed!
    pause
    exit /b 1
)

REM Backup application files
echo 📁 Backing up application files...
xcopy /E /Y api "%BACKUP_DIR%\api\" >nul
xcopy /E /Y client "%BACKUP_DIR%\client\" >nul
xcopy /E /Y uploads "%BACKUP_DIR%\uploads\" >nul
copy docker-compose.yml "%BACKUP_DIR%\" >nul
copy VERSION "%BACKUP_DIR%\" >nul

echo 🔄 Applying database migrations...
REM Apply migrations if any
if exist migrations (
    for %%f in (migrations\*.sql) do (
        echo Applying migration: %%f
        docker exec -i vtria-erp-db-1 mysql -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production < "%%f"
    )
)

echo 🛑 Stopping current services...
docker-compose down

echo 🏗️ Building new containers...
docker-compose -f docker-compose.production.yml build --no-cache

echo 🚀 Starting updated services...
docker-compose -f docker-compose.production.yml up -d

echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak >nul

echo 🔍 Verifying deployment...
REM Health check
curl http://localhost:3001/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ API Health Check: PASSED
) else (
    echo ❌ API Health Check: FAILED
    echo 🔄 Rolling back...
    goto :rollback
)

REM Frontend check
curl http://localhost:3000 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Frontend Health Check: PASSED
) else (
    echo ❌ Frontend Health Check: FAILED
    echo 🔄 Rolling back...
    goto :rollback
)

REM Database connectivity check
docker exec vtria-erp-db-1 mysql -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production -e "SELECT 1;" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Database Health Check: PASSED
) else (
    echo ❌ Database Health Check: FAILED
    echo 🔄 Rolling back...
    goto :rollback
)

echo ✅ Production deployment completed successfully!
echo 🌐 Frontend: http://localhost:3000
echo 🔌 API: http://localhost:3001
echo 💾 Database: localhost:3306
echo 📦 Backup saved in: %BACKUP_DIR%
goto :end

:rollback
echo 🔄 Rolling back to previous version...
docker-compose down
docker exec -i vtria-erp-db-1 mysql -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production < "%BACKUP_DIR%\database_backup.sql"
docker-compose -f docker-compose.production.yml up -d
echo ⚠️ Rollback completed. Please investigate the deployment issue.

:end
echo Deployment process completed. Press any key to continue...
pause >nul
EOF

# 4. Create health check script
cat > health-check.bat << 'EOF'
@echo off
echo 🔍 VTRIA ERP Production Health Check
echo ===================================

echo 📊 System Status:
docker-compose ps

echo.
echo 🌐 Service Health:
echo Frontend (Port 3000):
curl -s http://localhost:3000 >nul && echo ✅ Online || echo ❌ Offline

echo API (Port 3001):
curl -s http://localhost:3001/health >nul && echo ✅ Online || echo ❌ Offline

echo Database (Port 3306):
docker exec vtria-erp-db-1 mysql -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production -e "SELECT 1;" >nul 2>&1 && echo ✅ Online || echo ❌ Offline

echo Redis (Port 6379):
docker exec vtria-erp-redis-1 redis-cli -a RedisProductionPassword123! ping >nul 2>&1 && echo ✅ Online || echo ❌ Offline

echo.
echo 💾 Database Info:
docker exec vtria-erp-db-1 mysql -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production -e "SELECT COUNT(*) as 'Total Users' FROM users; SELECT COUNT(*) as 'Total Products' FROM products; SELECT version, applied_at FROM migration_history ORDER BY applied_at DESC LIMIT 1;" 2>nul

echo.
echo 📊 Resource Usage:
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

pause
EOF

# 5. Create rollback script
cat > rollback-production.bat << 'EOF'
@echo off
echo 🔄 VTRIA ERP Production Rollback
echo ===============================

REM Find latest backup
echo 🔍 Finding latest backup...
for /f %%i in ('dir backups /b /ad /o-d ^| findstr /r "20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]"') do (
    set LATEST_BACKUP=%%i
    goto :found
)
:found

if "%LATEST_BACKUP%"=="" (
    echo ❌ No backup found for rollback!
    pause
    exit /b 1
)

echo 📦 Rolling back to backup: %LATEST_BACKUP%
echo Are you sure you want to rollback? This will restore the previous version.
pause

echo 🛑 Stopping current services...
docker-compose down

echo 💾 Restoring database...
docker-compose -f docker-compose.production.yml up -d db
timeout /t 10 /nobreak >nul
docker exec -i vtria-erp-db-1 mysql -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production < "backups\%LATEST_BACKUP%\database_backup.sql"

echo 📁 Restoring application files...
rmdir /S /Q api_failed 2>nul
rmdir /S /Q client_failed 2>nul
move api api_failed 2>nul
move client client_failed 2>nul
xcopy /E /Y "backups\%LATEST_BACKUP%\api\*" api\
xcopy /E /Y "backups\%LATEST_BACKUP%\client\*" client\
copy "backups\%LATEST_BACKUP%\docker-compose.yml" . 2>nul
copy "backups\%LATEST_BACKUP%\VERSION" . 2>nul

echo 🚀 Starting restored services...
docker-compose -f docker-compose.production.yml up -d

echo ⏳ Waiting for services...
timeout /t 30 /nobreak >nul

echo 🔍 Verifying rollback...
call health-check.bat

echo ✅ Rollback completed successfully!
echo 📦 Failed version moved to: api_failed, client_failed
pause
EOF

# 6. Create maintenance mode script
cat > maintenance-mode.bat << 'EOF'
@echo off
if "%1"=="on" goto :maintenance_on
if "%1"=="off" goto :maintenance_off

echo Usage: maintenance-mode.bat [on|off]
pause
exit /b 1

:maintenance_on
echo 🚧 Enabling maintenance mode...
docker-compose down
echo Maintenance mode is now ON. Services are stopped.
echo To disable maintenance mode, run: maintenance-mode.bat off
pause
exit /b 0

:maintenance_off
echo 🚀 Disabling maintenance mode...
docker-compose -f docker-compose.production.yml up -d
echo Maintenance mode is now OFF. Services are starting...
timeout /t 30 /nobreak >nul
call health-check.bat
pause
exit /b 0
EOF

# 7. Create deployment documentation
cat > DEPLOYMENT_README.md << EOF
# VTRIA ERP Production Deployment v${VERSION}

## Deployment Package Contents
- Application code (api/, client/)
- Database migrations (migrations/)
- Production configuration
- Deployment scripts
- Rollback capability

## Deployment Steps

### 1. Transfer Package
Copy this entire folder to Windows production server:
\`C:\\vtria-erp-production\`

### 2. Deploy
Run as Administrator:
\`\`\`cmd
deploy-production.bat
\`\`\`

### 3. Verify
\`\`\`cmd
health-check.bat
\`\`\`

## Available Scripts
- \`deploy-production.bat\` - Deploy new version
- \`health-check.bat\` - Check system health
- \`rollback-production.bat\` - Rollback to previous version
- \`maintenance-mode.bat on/off\` - Enable/disable maintenance

## Rollback Process
If deployment fails:
\`\`\`cmd
rollback-production.bat
\`\`\`

## Version Information
- Version: ${VERSION}
- Build Date: $(date)
- Deployment Type: Production
- Database: MySQL 8.0
- Runtime: Docker

## Security Notes
- Production passwords are configured
- Debug endpoints disabled
- Rate limiting enabled
- Authentication required

## Support
For issues, contact VTRIA Development Team
EOF

echo "✅ Production deployment package created successfully!"
echo "📁 Location: $DEPLOYMENT_DIR"
echo "📦 Package: $DEPLOYMENT_NAME"
echo "🚀 Ready for transfer to Windows production server"

# Create transfer instructions
echo ""
echo "📋 Next Steps:"
echo "1. Copy '$DEPLOYMENT_DIR' to Windows production server"
echo "2. Run as Administrator: deploy-production.bat"
echo "3. Verify with: health-check.bat"
echo "4. Monitor with: health-check.bat (run periodically)"
```

#### 2. Execute Deployment on Windows Server
```cmd
REM 1. Copy deployment package to Windows
REM 2. Open Command Prompt as Administrator
cd C:\vtria-erp-production

REM 3. Run deployment
deploy-production.bat

REM 4. Verify deployment
health-check.bat
```

---

## 💾 Automated Backup System

### Daily Automated Backups

#### 1. Backup Script for Windows Server
**`scripts/backup-cron.sh`** (Runs inside Docker container)
```bash
#!/bin/bash

# VTRIA ERP Automated Backup Script
BACKUP_ROOT="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/daily/$DATE"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

echo "🔄 Starting automated backup - $DATE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# 1. Database Backup
echo "💾 Backing up database..."
mysqldump -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE > "$BACKUP_DIR/database.sql"

if [ $? -eq 0 ]; then
    echo "✅ Database backup completed"
    
    # Compress database backup
    gzip "$BACKUP_DIR/database.sql"
    echo "🗜️ Database backup compressed"
else
    echo "❌ Database backup failed"
    exit 1
fi

# 2. Create backup metadata
cat > "$BACKUP_DIR/backup_info.json" << EOF
{
  "backup_date": "$DATE",
  "backup_type": "daily_automated",
  "database_name": "$MYSQL_DATABASE",
  "version": "$(cat /app/VERSION 2>/dev/null || echo 'unknown')",
  "backup_size": "$(du -sh $BACKUP_DIR | cut -f1)"
}
EOF

# 3. Cleanup old backups
echo "🧹 Cleaning up old backups..."
find "$BACKUP_ROOT/daily" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null

# 4. Verify backup integrity
echo "🔍 Verifying backup integrity..."
if gunzip -t "$BACKUP_DIR/database.sql.gz"; then
    echo "✅ Backup integrity verified"
else
    echo "❌ Backup integrity check failed"
    exit 1
fi

echo "✅ Automated backup completed successfully"
echo "📁 Backup location: $BACKUP_DIR"

# 5. Log backup completion
echo "$(date): Backup completed - $BACKUP_DIR" >> "$BACKUP_ROOT/backup.log"
```

#### 2. Windows Backup Scheduler
**`setup-backup-scheduler.bat`** (Run once on Windows)
```batch
@echo off
echo 📅 Setting up VTRIA ERP Backup Scheduler...

REM Create scheduled task for daily backups at 2 AM
schtasks /create /tn "VTRIA ERP Daily Backup" /tr "docker exec vtria-erp-backup-1 /scripts/backup-cron.sh" /sc daily /st 02:00 /ru SYSTEM

REM Create scheduled task for weekly full backup on Sunday at 1 AM  
schtasks /create /tn "VTRIA ERP Weekly Backup" /tr "C:\vtria-erp-production\weekly-backup.bat" /sc weekly /d SUN /st 01:00 /ru SYSTEM

echo ✅ Backup scheduler configured successfully!
echo 📅 Daily backups: 2:00 AM every day
echo 📅 Weekly backups: 1:00 AM every Sunday
pause
```

#### 3. Weekly Full System Backup
**`weekly-backup.bat`**
```batch
@echo off
set BACKUP_DATE=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%
set WEEKLY_BACKUP_DIR=C:\vtria-erp-backups\weekly\%BACKUP_DATE%

echo 📦 Creating weekly full system backup...
mkdir "%WEEKLY_BACKUP_DIR%" 2>nul

REM Backup database
echo 💾 Backing up database...
docker exec vtria-erp-db-1 mysqldump -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production > "%WEEKLY_BACKUP_DIR%\database_full.sql"

REM Backup application files
echo 📁 Backing up application files...
xcopy /E /Y C:\vtria-erp-production\api "%WEEKLY_BACKUP_DIR%\api\"
xcopy /E /Y C:\vtria-erp-production\client "%WEEKLY_BACKUP_DIR%\client\"
xcopy /E /Y C:\vtria-erp-production\uploads "%WEEKLY_BACKUP_DIR%\uploads\"
xcopy /E /Y C:\vtria-erp-production\logs "%WEEKLY_BACKUP_DIR%\logs\"

REM Backup configuration
copy C:\vtria-erp-production\docker-compose.production.yml "%WEEKLY_BACKUP_DIR%\"
copy C:\vtria-erp-production\.env.production "%WEEKLY_BACKUP_DIR%\"
copy C:\vtria-erp-production\VERSION "%WEEKLY_BACKUP_DIR%\"

REM Create backup report
echo {> "%WEEKLY_BACKUP_DIR%\backup_report.json"
echo   "backup_type": "weekly_full",>> "%WEEKLY_BACKUP_DIR%\backup_report.json"
echo   "backup_date": "%BACKUP_DATE%",>> "%WEEKLY_BACKUP_DIR%\backup_report.json"
echo   "files_included": ["database", "application", "uploads", "logs", "config"]>> "%WEEKLY_BACKUP_DIR%\backup_report.json"
echo }>> "%WEEKLY_BACKUP_DIR%\backup_report.json"

REM Cleanup old weekly backups (keep 8 weeks)
forfiles /p C:\vtria-erp-backups\weekly /d -56 /c "cmd /c rmdir /s /q @path" 2>nul

echo ✅ Weekly backup completed: %WEEKLY_BACKUP_DIR%
```

### Recovery Point Management

#### 1. Create Recovery Points
**`create-recovery-point.bat`**
```batch
@echo off
set /p RECOVERY_NAME="Enter recovery point name (e.g., before-client-portal-update): "
set RECOVERY_DATE=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set RECOVERY_DATE=%RECOVERY_DATE: =0%
set RECOVERY_DIR=C:\vtria-erp-backups\recovery-points\%RECOVERY_DATE%_%RECOVERY_NAME%

echo 📍 Creating recovery point: %RECOVERY_NAME%
mkdir "%RECOVERY_DIR%" 2>nul

echo 💾 Backing up database...
docker exec vtria-erp-db-1 mysqldump -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production > "%RECOVERY_DIR%\database.sql"

echo 📁 Backing up application state...
xcopy /E /Y api "%RECOVERY_DIR%\api\"
xcopy /E /Y client "%RECOVERY_DIR%\client\"
copy docker-compose.production.yml "%RECOVERY_DIR%\"
copy VERSION "%RECOVERY_DIR%\"

echo 📝 Creating recovery point manifest...
echo {> "%RECOVERY_DIR%\recovery_manifest.json"
echo   "recovery_point_name": "%RECOVERY_NAME%",>> "%RECOVERY_DIR%\recovery_manifest.json"
echo   "created_date": "%RECOVERY_DATE%",>> "%RECOVERY_DIR%\recovery_manifest.json"
echo   "version": "$(type VERSION)",>> "%RECOVERY_DIR%\recovery_manifest.json"
echo   "description": "Manual recovery point created before changes">> "%RECOVERY_DIR%\recovery_manifest.json"
echo }>> "%RECOVERY_DIR%\recovery_manifest.json"

echo ✅ Recovery point created successfully!
echo 📁 Location: %RECOVERY_DIR%
pause
```

#### 2. List Recovery Points
**`list-recovery-points.bat`**
```batch
@echo off
echo 📍 Available Recovery Points
echo ===========================

for /d %%i in (C:\vtria-erp-backups\recovery-points\*) do (
    echo.
    echo 📁 %%~ni
    if exist "%%i\recovery_manifest.json" (
        type "%%i\recovery_manifest.json"
    ) else (
        echo   No manifest available
    )
)

echo.
echo To restore a recovery point, run: restore-recovery-point.bat
pause
```

#### 3. Restore from Recovery Point
**`restore-recovery-point.bat`**
```batch
@echo off
echo 📍 VTRIA ERP Recovery Point Restoration
echo ======================================

call list-recovery-points.bat

echo.
set /p RECOVERY_FOLDER="Enter recovery point folder name: "
set RECOVERY_PATH=C:\vtria-erp-backups\recovery-points\%RECOVERY_FOLDER%

if not exist "%RECOVERY_PATH%" (
    echo ❌ Recovery point not found: %RECOVERY_PATH%
    pause
    exit /b 1
)

echo ⚠️  WARNING: This will restore the system to the selected recovery point.
echo ⚠️  Current data will be backed up before restoration.
echo.
set /p CONFIRM="Are you sure you want to proceed? (yes/no): "

if not "%CONFIRM%"=="yes" (
    echo ❌ Restoration cancelled.
    pause
    exit /b 0
)

echo 📦 Creating current state backup before restoration...
set CURRENT_BACKUP=C:\vtria-erp-backups\before-recovery\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set CURRENT_BACKUP=%CURRENT_BACKUP: =0%
mkdir "%CURRENT_BACKUP%" 2>nul

docker exec vtria-erp-db-1 mysqldump -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production > "%CURRENT_BACKUP%\database.sql"
xcopy /E /Y api "%CURRENT_BACKUP%\api\"
xcopy /E /Y client "%CURRENT_BACKUP%\client\"

echo 🛑 Stopping services...
docker-compose down

echo 💾 Restoring database...
docker-compose -f docker-compose.production.yml up -d db
timeout /t 15 /nobreak >nul
docker exec -i vtria-erp-db-1 mysql -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production < "%RECOVERY_PATH%\database.sql"

echo 📁 Restoring application files...
rmdir /S /Q api_backup 2>nul
rmdir /S /Q client_backup 2>nul
move api api_backup 2>nul
move client client_backup 2>nul
xcopy /E /Y "%RECOVERY_PATH%\api\*" api\
xcopy /E /Y "%RECOVERY_PATH%\client\*" client\
copy "%RECOVERY_PATH%\VERSION" . 2>nul

echo 🚀 Starting restored services...
docker-compose -f docker-compose.production.yml up -d

echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak >nul

echo 🔍 Verifying restoration...
call health-check.bat

echo ✅ Recovery point restoration completed!
echo 📦 Previous state backed up to: %CURRENT_BACKUP%
echo 📁 Restored from: %RECOVERY_PATH%
pause
```

---

## 📊 Production Monitoring

### System Monitoring Dashboard
**`monitor-production.bat`**
```batch
@echo off
:loop
cls
echo ⚡ VTRIA ERP Production Monitor
echo ==============================
echo Last Updated: %date% %time%
echo.

echo 🖥️  System Resources:
wmic cpu get loadpercentage /value | findstr LoadPercentage
for /f "skip=1" %%p in ('wmic os get TotalVisibleMemorySize^,FreePhysicalMemory /format:value') do echo %%p

echo.
echo 🐳 Docker Containers:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo 🌐 Service Health:
curl -s http://localhost:3000 >nul && echo ✅ Frontend: Online || echo ❌ Frontend: Offline
curl -s http://localhost:3001/health >nul && echo ✅ API: Online || echo ❌ API: Offline
docker exec vtria-erp-db-1 mysql -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production -e "SELECT 1;" >nul 2>&1 && echo ✅ Database: Online || echo ❌ Database: Offline

echo.
echo 📊 Quick Stats:
docker exec vtria-erp-db-1 mysql -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production -e "SELECT 'Active Users:' as Metric, COUNT(*) as Count FROM users WHERE status='active' UNION SELECT 'Total Products:', COUNT(*) FROM products UNION SELECT 'Total Cases:', COUNT(*) FROM cases;" 2>nul

echo.
echo 💾 Latest Backup:
for /f %%i in ('dir C:\vtria-erp-backups\daily /b /ad /o-d 2^>nul ^| findstr /r "20[0-9][0-9]" ^| head -1') do echo ✅ Latest Backup: %%i

echo.
echo Press Ctrl+C to exit, or wait 30 seconds for refresh...
timeout /t 30 /nobreak >nul
goto loop
```

### Automated Alerts
**`setup-alerts.bat`**
```batch
@echo off
echo 🔔 Setting up VTRIA ERP Production Alerts...

REM Create alert script
cat > alert-checker.bat << 'EOF'
@echo off
REM Check if services are down
curl -s http://localhost:3001/health >nul
if %ERRORLEVEL% neq 0 (
    echo ALERT: API is down! | eventcreate /t error /id 1001 /l application /so "VTRIA ERP"
)

curl -s http://localhost:3000 >nul  
if %ERRORLEVEL% neq 0 (
    echo ALERT: Frontend is down! | eventcreate /t error /id 1002 /l application /so "VTRIA ERP"
)

docker exec vtria-erp-db-1 mysql -u vtria_prod_user -pSecureProductionPassword123! vtria_erp_production -e "SELECT 1;" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ALERT: Database is down! | eventcreate /t error /id 1003 /l application /so "VTRIA ERP"
)
EOF

REM Schedule alert checking every 5 minutes
schtasks /create /tn "VTRIA ERP Health Check" /tr "C:\vtria-erp-production\alert-checker.bat" /sc minute /mo 5 /ru SYSTEM

echo ✅ Alerts configured successfully!
echo 🔔 Health checks will run every 5 minutes
echo 📝 Alerts will be logged to Windows Event Log
pause
```

---

## 🎯 Quick Reference Commands

### Development (MacBook)
```bash
# Create new feature
git checkout -b feature/new-feature
# ... code with any AI tool (Claude Code, Windsurfer, VS Code + Copilot)
git add .
git commit -m "feat: add new feature"

# Create deployment package
./scripts/create-production-deployment.sh 1.2.0

# Transfer to Windows server
```

### Production (Windows Server)
```cmd
# Deploy update
deploy-production.bat

# Check health
health-check.bat

# Create recovery point
create-recovery-point.bat

# Monitor system
monitor-production.bat

# Emergency rollback
rollback-production.bat
```

### Backup & Recovery
```cmd
# List recovery points
list-recovery-points.bat

# Restore from recovery point
restore-recovery-point.bat

# Manual backup
weekly-backup.bat
```

---

## 🔒 Security Checklist

### Production Security Configuration
- [ ] Production passwords configured
- [ ] Debug endpoints disabled
- [ ] Rate limiting enabled
- [ ] HTTPS configured (if external access needed)
- [ ] Firewall rules configured
- [ ] Regular security updates scheduled
- [ ] Backup encryption enabled
- [ ] Access logs monitored

### Database Security
- [ ] Strong database passwords
- [ ] Limited database user permissions
- [ ] Regular database backups verified
- [ ] SQL injection protection enabled
- [ ] Database connection encryption

### Application Security
- [ ] JWT secrets are production-grade
- [ ] File upload restrictions in place
- [ ] Input validation enabled
- [ ] Error handling doesn't expose sensitive info
- [ ] Dependencies regularly updated

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: Services won't start**
```cmd
# Check Docker
docker --version
docker-compose --version

# Check ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Solution
cleanup-ports.bat
docker-compose down
docker-compose -f docker-compose.production.yml up -d
```

**Issue: Database connection failed**
```cmd
# Check database status
docker logs vtria-erp-db-1

# Reset database password
docker exec -it vtria-erp-db-1 mysql -u root -p
# Use root password to reset user password
```

**Issue: Deployment failed**
```cmd
# Check logs
docker-compose logs

# Rollback
rollback-production.bat

# Or restore recovery point
restore-recovery-point.bat
```

### Emergency Contacts
- **Development Team**: [Your contact info]
- **System Administrator**: [Admin contact]
- **VTRIA Management**: [Management contact]

---

**Last Updated**: September 2024  
**Version**: 1.0.0  
**Prepared by**: VTRIA Development Team