# VTRIA ERP Installation Guide

## Overview

VTRIA Engineering Solutions ERP System is a comprehensive business management solution built with:
- **Frontend:** React 18 with TypeScript, Material-UI
- **Backend:** Node.js with Express
- **Database:** MySQL 8.0
- **State Management:** Zustand
- **Caching:** Redis
- **Containerization:** Docker & Docker Compose

## Prerequisites

Before installing VTRIA ERP, ensure you have:

1. **Docker & Docker Compose** (Recommended)
   - Docker Desktop 4.0+ or Docker Engine 20.10+
   - Docker Compose 2.0+

2. **Alternative (Manual Setup)**
   - Node.js 18.0+
   - MySQL 8.0+
   - Redis 6.0+
   - npm or yarn package manager

## Quick Start (Docker - Recommended)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd vtria-erp
```

### 2. Environment Configuration
Copy environment files:
```bash
# API environment
cp api/.env.example api/.env

# Client environment  
cp client/.env.example client/.env
```

### 3. Configure Environment Variables

**API (.env):**
```env
# Database Configuration
DB_HOST=db
DB_PORT=3306
DB_USER=vtria_user
DB_PASS=dev_password
DB_NAME=vtria_erp

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development

# Authentication (Set to false for production)
BYPASS_AUTH=true

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/vtria-erp/uploads

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Client (.env):**
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_COMPANY_NAME=VTRIA Engineering Solutions Pvt Ltd
REACT_APP_VERSION=1.0.0
```

### 4. Build and Start Services
```bash
# Start all services
docker-compose up --build

# Or start in detached mode
docker-compose up --build -d
```

### 5. Initialize Database
The database will be automatically initialized with the schema files in `sql/schema/` directory.

### 6. Access the Application
- **Frontend:** http://localhost:3100
- **API:** http://localhost:3001
- **API Documentation:** http://localhost:3001/api-docs
- **Database:** localhost:3306

## Manual Installation

### 1. Database Setup

**Install MySQL 8.0:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# macOS
brew install mysql

# Start MySQL
sudo systemctl start mysql  # Linux
brew services start mysql   # macOS
```

**Create Database and User:**
```sql
CREATE DATABASE vtria_erp;
CREATE USER 'vtria_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON vtria_erp.* TO 'vtria_user'@'localhost';
FLUSH PRIVILEGES;
```

**Import Database Schema:**
```bash
cd vtria-erp/sql/schema
mysql -u vtria_user -p vtria_erp < 001_initial_schema.sql
mysql -u vtria_user -p vtria_erp < 002_quotation_schema.sql
# Import all schema files in order...
```

### 2. Redis Setup

**Install Redis:**
```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis

# Start Redis
sudo systemctl start redis   # Linux
brew services start redis    # macOS
```

### 3. Backend Setup

```bash
cd api
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env file with your database credentials

# Start development server
npm run dev
```

### 4. Frontend Setup

```bash
cd client
npm install

# Install TypeScript types
npm install --save-dev typescript @types/react @types/react-dom

# Copy and configure environment
cp .env.example .env
# Edit .env file

# Start development server
npm start
```

## Configuration

### Database Schema Migration

If you need to update the database schema:

```bash
# Run specific schema file
docker exec -it vtria-erp_db_1 mysql -u vtria_user -p vtria_erp < sql/schema/new_schema.sql
```

### User Roles and Permissions

The system includes the following user roles:

1. **Director** - Full system access
2. **Admin** - Administrative functions
3. **Sales-Admin** - Sales and quotation management
4. **Designer** - Estimation and technical design
5. **Accounts** - Financial and accounting functions
6. **Technician** - Manufacturing and production

### Default Admin User

Create the first admin user:

```sql
INSERT INTO users (email, password_hash, full_name, user_role, status) 
VALUES (
    'admin@vtria.com', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'admin123'
    'System Administrator',
    'director',
    'active'
);
```

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
- Verify MySQL is running
- Check database credentials in .env file
- Ensure database `vtria_erp` exists

**2. Redis Connection Failed**
- Verify Redis is running: `redis-cli ping`
- Check Redis host/port in .env file

**3. Docker Issues**
```bash
# Clean up containers and volumes
docker-compose down -v
docker system prune -f

# Rebuild from scratch
docker-compose up --build --force-recreate
```

**4. Permission Issues**
```bash
# Fix file permissions
sudo chown -R $USER:$USER ./uploads
sudo chown -R $USER:$USER ./logs
```

**5. Port Already in Use**
```bash
# Check what's using the port
lsof -i :3001
lsof -i :3100

# Kill the process
kill -9 <PID>
```

### Database Reset

To reset the database completely:

```bash
# Using Docker
docker-compose down -v
docker-compose up --build

# Manual
mysql -u root -p -e "DROP DATABASE vtria_erp; CREATE DATABASE vtria_erp;"
# Re-import all schema files
```

### Logs and Debugging

**View Docker Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f client
docker-compose logs -f db
```

**Log Files Location:**
- API logs: `api/logs/`
- Application logs: `logs/`
- Database logs: Check MySQL configuration

## Production Deployment

### Environment Variables

Update production environment variables:

```env
NODE_ENV=production
DB_HOST=your-production-db-host
DB_PASS=secure_production_password
JWT_SECRET=very_secure_production_secret
BYPASS_AUTH=false
```

### SSL/HTTPS Setup

Use a reverse proxy like Nginx:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Backup

Set up regular database backups:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u vtria_user -p vtria_erp > backup_vtria_erp_$DATE.sql
```

## Support

For technical support:
- Check the troubleshooting section above
- Review application logs
- Check API documentation at `/api-docs`
- Contact VTRIA Engineering Solutions support team

## License

Copyright © 2024 VTRIA Engineering Solutions Pvt Ltd. All rights reserved.