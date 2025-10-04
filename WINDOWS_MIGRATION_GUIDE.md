# VTRIA ERP - Windows Migration Guide
# Complete Setup Instructions for Windows Environment

## 📋 Prerequisites Checklist

### System Requirements
- Windows 10/11 Pro or Enterprise (for Docker Desktop)
- Minimum 16GB RAM (recommended 32GB)
- Minimum 100GB free disk space
- Administrator privileges

### Software Requirements
- [Node.js 18+ LTS](https://nodejs.org/)
- [Git for Windows](https://gitforwindows.org/)
- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- [MySQL 8.0+](https://dev.mysql.com/downloads/mysql/) OR [PostgreSQL 14+](https://www.postgresql.org/download/windows/)
- [Visual Studio Code](https://code.visualstudio.com/) (recommended)
- [Windows Terminal](https://www.microsoft.com/store/productId/9N0DX20HK701) (recommended)

## 🚀 Step-by-Step Setup Instructions

### Step 1: Prepare Your Windows Environment

#### 1.1 Install Node.js
```powershell
# Download and install Node.js 18+ LTS from nodejs.org
# Verify installation
node --version
npm --version
```

#### 1.2 Install Git
```powershell
# Download and install Git for Windows
git --version
```

#### 1.3 Install Docker Desktop
```powershell
# Download and install Docker Desktop for Windows
# Enable WSL 2 if prompted
# Start Docker Desktop
docker --version
docker-compose --version
```

#### 1.4 Install Database (Choose MySQL or PostgreSQL)

**For MySQL:**
```powershell
# Download MySQL 8.0+ installer
# Run as Administrator
# Configure with default settings
# Set root password: 'vtria_admin_2024'
mysql --version
```

**For PostgreSQL:**
```powershell
# Download PostgreSQL 14+ installer
# Set password: 'vtria_admin_2024'
# Create database: vtria_erp
psql --version
```

### Step 2: Transfer Codebase from MacBook

#### 2.1 Create Project Directory
```powershell
# Create main project directory
mkdir C:\Projects
cd C:\Projects
```

#### 2.2 Clone Repository (if using Git)
```powershell
# If you have the code in a Git repository
git clone <your-repository-url> vtria-erp
cd vtria-erp
```

#### 2.3 Manual Transfer (if not using Git)
```powershell
# Copy the entire project folder from MacBook to Windows
# Use external drive, network share, or cloud storage
# Extract/copy to C:\Projects\vtria-erp
```

### Step 3: Configure Environment

#### 3.1 Setup Environment Variables
```powershell
# Create .env file in api directory
cd C:\Projects\vtria-erp\api
copy .env.example .env

# Edit .env file with Windows-specific paths
notepad .env
```

**Update .env file with Windows paths:**
```env
# Server Configuration
PORT=3002
NODE_ENV=development
BYPASS_AUTH=false
FRONTEND_URL=http://localhost:3000

# Database Configuration (choose MySQL or PostgreSQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=vtria_user
DB_PASS=vtria_password
DB_NAME=vtria_erp

# File Paths (Windows format)
UPLOAD_PATH=C:\\Projects\\vtria-erp\\uploads
LOG_PATH=C:\\Projects\\vtria-erp\\logs
BACKUP_PATH=C:\\Projects\\vtria-erp\\backups
```

#### 3.2 Configure Client Environment
```powershell
cd C:\Projects\vtria-erp\client
copy .env.example .env

# Edit client .env
notepad .env
```

**Client .env configuration:**
```env
REACT_APP_API_URL=http://localhost:3002
REACT_APP_NAME=VTRIA ERP System
REACT_APP_VERSION=1.0.0
GENERATE_SOURCEMAP=false
```

### Step 4: Database Setup

#### 4.1 MySQL Setup
```powershell
# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE vtria_erp;
CREATE USER 'vtria_user'@'localhost' IDENTIFIED BY 'vtria_password';
GRANT ALL PRIVILEGES ON vtria_erp.* TO 'vtria_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 4.2 PostgreSQL Setup
```powershell
# Login to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE vtria_erp;
CREATE USER vtria_user WITH PASSWORD 'vtria_password';
GRANT ALL PRIVILEGES ON DATABASE vtria_erp TO vtria_user;
\\q
```

#### 4.3 Run Database Migrations
```powershell
cd C:\Projects\vtria-erp\api

# Install dependencies
npm install

# Run migrations (if using Sequelize)
npx sequelize-cli db:migrate

# Seed initial data
npx sequelize-cli db:seed:all
```

### Step 5: Install Dependencies

#### 5.1 Backend Dependencies
```powershell
cd C:\Projects\vtria-erp\api
npm install
```

#### 5.2 Frontend Dependencies
```powershell
cd C:\Projects\vtria-erp\client
npm install
```

#### 5.3 Root Dependencies
```powershell
cd C:\Projects\vtria-erp
npm install
```

### Step 6: Docker Configuration

#### 6.1 Update Docker Compose for Windows
```powershell
cd C:\Projects\vtria-erp
notepad docker-compose.yml
```

**Update docker-compose.yml for Windows paths:**
```yaml
version: '3.8'
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: vtria_admin_2024
      MYSQL_DATABASE: vtria_erp
      MYSQL_USER: vtria_user
      MYSQL_PASSWORD: vtria_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./sql:/docker-entrypoint-initdb.d
    networks:
      - vtria-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - vtria-network

  api:
    build:
      context: ./api
      dockerfile: Dockerfile.windows
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
    volumes:
      - ./api:/app
      - /app/node_modules
    depends_on:
      - db
      - redis
    networks:
      - vtria-network

volumes:
  mysql_data:

networks:
  vtria-network:
    driver: bridge
```

#### 6.2 Create Windows-specific Dockerfile
```powershell
cd C:\Projects\vtria-erp\api
notepad Dockerfile.windows
```

**Dockerfile.windows content:**
```dockerfile
FROM node:18-alpine

# Install Windows-compatible dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs backups

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["npm", "start"]
```

### Step 7: Start the Application

#### 7.1 Using Docker (Recommended)
```powershell
cd C:\Projects\vtria-erp

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

#### 7.2 Manual Start (Alternative)
```powershell
# Terminal 1: Start Backend
cd C:\Projects\vtria-erp\api
npm run dev

# Terminal 2: Start Frontend
cd C:\Projects\vtria-erp\client
npm start
```

### Step 8: Verify Installation

#### 8.1 Test API Endpoints
```powershell
# Test health endpoint
curl http://localhost:3002/health

# Test API endpoints
curl http://localhost:3002/api/users
```

#### 8.2 Access Web Interface
- Frontend: http://localhost:3000
- API Documentation: http://localhost:3002/api-docs
- Adminer (Database UI): http://localhost:8080

## 🔄 Remote Development Setup (MacBook ↔ Windows)

### Option 1: Git-based Sync

#### 1.1 Setup Git Repository
```bash
# On MacBook
cd /Users/srbhandary/Documents/Projects/vtria-erp
git init
git add .
git commit -m "Initial commit"
```

#### 1.2 Push to Remote Repository
```bash
# Create repository on GitHub/GitLab
git remote add origin <your-repo-url>
git push -u origin main
```

#### 1.3 Sync on Windows
```powershell
cd C:\Projects
git clone <your-repo-url> vtria-erp
cd vtria-erp
npm install
```

#### 1.4 Development Workflow
```bash
# On MacBook - Make changes
git add .
git commit -m "feature: your changes"
git push

# On Windows - Pull changes
git pull
npm run build  # If needed
docker-compose restart
```

### Option 2: Docker Remote Development

#### 2.1 Enable Docker Remote API
```powershell
# On Windows - Enable Docker Remote API
netsh advfirewall firewall add rule name="Docker Remote API" dir=in action=allow protocol=TCP localport=2376

# Edit Docker Desktop settings
# Settings → General → Expose daemon on tcp://localhost:2376 without TLS
```

#### 2.2 Configure MacBook for Remote Docker
```bash
# On MacBook - Install Docker CLI
brew install docker

# Set DOCKER_HOST environment variable
export DOCKER_HOST=tcp://WINDOWS_IP:2376

# Test connection
docker ps
```

#### 2.3 Create Remote Development Script
```bash
# On MacBook - Create remote-deploy.sh
#!/bin/bash

# Remote deployment script
WINDOWS_IP="YOUR_WINDOWS_IP"
DOCKER_HOST="tcp://$WINDOWS_IP:2376"

echo "🚀 Deploying to Windows Docker..."

# Build and push changes
docker build -t vtria-erp-api:latest ./api
docker tag vtria-erp-api:latest $WINDOWS_IP:5000/vtria-erp-api:latest
docker push $WINDOWS_IP:5000/vtria-erp-api:latest

# Restart services on Windows
ssh user@$WINDOWS_IP "cd C:/Projects/vtria-erp && docker-compose pull && docker-compose up -d"

echo "✅ Deployment complete!"
```

### Option 3: File Synchronization

#### 3.1 Using rsync (Recommended)
```bash
# On MacBook - Install rsync
brew install rsync

# Create sync script
#!/bin/bash
WINDOWS_IP="YOUR_WINDOWS_IP"
WINDOWS_USER="your_windows_username"

rsync -avz --exclude='node_modules' --exclude='.git' --exclude='*.log' \
  /Users/srbhandary/Documents/Projects/vtria-erp/ \
  $WINDOWS_USER@$WINDOWS_IP:/c/Projects/vtria-erp/

# Restart Windows services
ssh $WINDOWS_USER@$WINDOWS_IP "cd /c/Projects/vtria-erp && docker-compose restart"
```

#### 3.2 Using Syncthing (Real-time sync)
```bash
# On MacBook
brew install syncthing

# Configure Syncthing to sync project folder
# Add Windows machine as sync target
```

## 🛠️ Windows-Specific Troubleshooting

### Common Issues and Solutions

#### Issue 1: Port Conflicts
```powershell
# Check what's using ports
netstat -ano | findstr :3000
netstat -ano | findstr :3002

# Kill process using port
taskkill /PID <PID> /F
```

#### Issue 2: Docker Permission Issues
```powershell
# Run Docker Desktop as Administrator
# Or add user to docker-users group
```

#### Issue 3: Path Issues
```powershell
# Use Windows paths in .env files
# C:\Projects\vtria-erp\logs
# Instead of /Users/username/Projects/vtria-erp/logs
```

#### Issue 4: Node-gyp Issues
```powershell
# Install Windows build tools
npm install -g windows-build-tools

# Or use node-gyp with Python
npm config set python python2.7
```

## 📊 Performance Optimization for Windows

### 1. Docker Performance
```powershell
# Enable WSL 2 integration in Docker Desktop
# Use Docker volumes instead of bind mounts where possible
# Increase Docker memory limit to 4GB+
```

### 2. Node.js Performance
```powershell
# Use PowerShell instead of Command Prompt
# Enable Node.js performance monitoring
set NODE_ENV=production
```

### 3. Database Optimization
```powershell
# Increase MySQL/PostgreSQL memory limits
# Configure connection pooling
# Use SSD storage for database files
```

## 🔧 Maintenance Scripts

### Create Windows Batch Scripts

**start-services.bat:**
```batch
@echo off
echo Starting VTRIA ERP Services...
cd C:\Projects\vtria-erp
docker-compose up -d
echo Services started. Access at http://localhost:3000
pause
```

**stop-services.bat:**
```batch
@echo off
echo Stopping VTRIA ERP Services...
cd C:\Projects\vtria-erp
docker-compose down
echo Services stopped.
pause
```

**update-code.bat:**
```batch
@echo off
echo Updating VTRIA ERP Code...
cd C:\Projects\vtria-erp
git pull
docker-compose build --no-cache
docker-compose up -d
echo Update complete!
pause
```

## 📞 Support and Next Steps

### Testing Your Setup
1. ✅ API responds at http://localhost:3002/health
2. ✅ Frontend loads at http://localhost:3000
3. ✅ Database connections work
4. ✅ Docker containers are running
5. ✅ Remote sync is configured

### Getting Help
- Check logs: `docker-compose logs -f`
- View container status: `docker-compose ps`
- Access database: Use Adminer at http://localhost:8080

### Next Steps
1. Configure backup schedules
2. Set up monitoring and alerts
3. Configure SSL certificates for production
4. Set up automated deployment pipeline

---

**🎉 Your VTRIA ERP system is now successfully migrated to Windows!**

**Access URLs:**
- Frontend: http://localhost:3000
- API: http://localhost:3002
- Database UI: http://localhost:8080

**Default Login:**
- Email: admin@vtria.com
- Password: VtriaAdmin@2024