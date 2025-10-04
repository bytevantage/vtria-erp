# VTRIA ERP - Fully Containerized Setup (Database in Docker)

## 🎯 You're Absolutely Right! The Database IS in Docker!

Yes! The database **is already configured** to run in Docker. You **don't need to install MySQL externally** - it's all containerized!

---

## 🐳 Complete Containerized Setup

### Step 1: Copy the Project Folder

```bash
# Copy from MacBook to Windows
cp -r /Users/srbhandary/Documents/Projects/vtria-erp /path/to/windows/drive

# On Windows: C:\Projects\vtria-erp
```

### Step 2: Quick Setup (No External Database Needed!)

```powershell
cd C:\Projects\vtria-erp

# Run the automated setup
.\quick-windows-setup.bat
```

### Step 3: Start Everything with Docker

```powershell
# This starts: API + Frontend + Database + Redis
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**That's it!** No external database installation needed!

---

## 🗄️ What's Running in Docker?

Your `docker-compose.yml` already includes:

```yaml
services:
  # ✅ API Server (Node.js/Express)
  api:
    build: ./api
    ports: ["3001:3001"]
    
  # ✅ Frontend (React)
  client:
    build: ./client  
    ports: ["3000:3000"]
    
  # ✅ Database (MySQL 8.0) - ALREADY CONTAINERIZED!
  db:
    image: mysql:8.0
    ports: ["3306:3306"]
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=vtria_erp
      - MYSQL_USER=vtria_user
      - MYSQL_PASSWORD=dev_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./sql/schema:/docker-entrypoint-initdb.d
      
  # ✅ Cache (Redis)
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

---

## 🔧 Environment Configuration

### Update api\.env for Docker Database

```powershell
cd C:\Projects\vtria-erp
notepad api\.env
```

**Docker Database Settings:**
```env
# Database (Docker container)
DB_HOST=db
DB_PORT=3306
DB_USER=vtria_user
DB_PASS=dev_password
DB_NAME=vtria_erp

# Redis (Docker container)  
REDIS_HOST=redis
REDIS_PORT=6379

# Other settings
NODE_ENV=development
PORT=3001
```

---

## 🚀 Access Your Application

**Start Everything:**
```powershell
docker-compose up -d
```

**Access URLs:**
- ✅ **Frontend:** http://localhost:3000
- ✅ **API:** http://localhost:3001
- ✅ **Database:** Already connected internally
- ✅ **API Docs:** http://localhost:3001/api-docs

**Default Login:**
- Email: admin@vtria.com
- Password: VtriaAdmin@2024

---

## 📊 Database Management

### Option 1: Adminer (Web UI - Included in Docker)

Access: http://localhost:8080
- Server: db
- Username: vtria_user
- Password: dev_password
- Database: vtria_erp

### Option 2: Command Line

```powershell
# Connect to database in Docker
docker-compose exec db mysql -u vtria_user -p vtria_erp

# Or from host
mysql -h localhost -P 3306 -u vtria_user -p vtria_erp
```

---

## 🔄 Database Persistence

Your data is **automatically persisted** in Docker volumes:

```yaml
volumes:
  mysql_data:    # Database data persists here
  redis_data:    # Redis data persists here
```

**Data survives:**
- ✅ Container restarts
- ✅ Docker Compose down/up
- ✅ Even if you delete containers

**To backup data:**
```powershell
# Backup database
docker-compose exec db mysqldump -u vtria_user -p vtria_erp > backup.sql

# Backup volumes
docker run --rm -v vtria-erp_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql_backup.tar.gz -C /data .
```

---

## 🛠️ Troubleshooting

### Check Container Status
```powershell
docker-compose ps
docker-compose logs -f
```

### Restart Services
```powershell
docker-compose restart
```

### Reset Everything
```powershell
# Stop and remove everything
docker-compose down -v

# Start fresh
docker-compose up -d
```

### Database Connection Issues
```powershell
# Check if database is ready
docker-compose exec db mysqladmin ping -u vtria_user -p

# View database logs
docker-compose logs db
```

---

## 🎯 Why Docker Database is Better

### ✅ **Advantages:**
- **No external installation** - everything in containers
- **Consistent environment** - same setup on any machine
- **Easy backup/restore** - volume-based persistence
- **Version control** - exact MySQL version specified
- **Isolation** - doesn't conflict with host system
- **Easy scaling** - can run multiple instances

### ✅ **Automatic Setup:**
- Database created automatically
- Tables created from SQL files
- User accounts created
- Health checks ensure readiness

---

## 📋 Complete Setup Checklist

- ✅ **Copy project folder** from MacBook to Windows
- ✅ **Run quick setup script** (`quick-windows-setup.bat`)
- ✅ **Start with Docker** (`docker-compose up -d`)
- ✅ **Database is automatically created** in Docker container
- ✅ **Access application** at http://localhost:3000

**No external database installation needed!** 🎉

---

## 🔄 For Development

### Connect from Host Machine
```powershell
# Connect to Docker database from Windows
mysql -h localhost -P 3306 -u vtria_user -p vtria_erp

# Or use any MySQL client
# Host: localhost
# Port: 3306
# User: vtria_user
# Password: dev_password
```

### Database Schema
The database schema is automatically created from:
- `./sql/schema/` directory (mounted in Docker)
- Sequelize migrations (if configured)

---

## 🎉 Summary

**You were absolutely right!** The database IS already in Docker. Here's what you need to do:

1. **Copy** the entire folder from MacBook to Windows ✅
2. **Run** `quick-windows-setup.bat` ✅  
3. **Start** with `docker-compose up -d` ✅
4. **Database is automatically created** in Docker ✅
5. **Access** at http://localhost:3000 ✅

**Everything is containerized - no external database needed!** 🚀

**Ready to start?** Just run `docker-compose up -d`!