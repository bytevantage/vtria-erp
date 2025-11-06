# Database Container Crash - Troubleshooting Guide

## Problem
The `db-1` (MySQL) container crashes after a few minutes of running on Windows.

---

## Common Causes & Solutions

### 🔴 CAUSE 1: Out of Memory (OOM Killer)
**Symptoms:**
- Container exits with code 137
- Docker logs show "Killed" or "OOM"
- System becomes slow before crash

**Solution:**
```powershell
# Increase Docker Desktop memory limit
# 1. Open Docker Desktop → Settings → Resources
# 2. Increase Memory to at least 4GB (recommended: 6GB+)
# 3. Click "Apply & Restart"

# Or reduce MySQL memory usage in docker-compose.yml (already done)
```

---

### 🔴 CAUSE 2: Disk Space Full
**Symptoms:**
- Container logs show "No space left on device"
- Docker commands fail with disk errors

**Solution:**
```powershell
# Check disk space
docker system df

# Clean up unused Docker resources
docker system prune -a --volumes
# WARNING: This removes ALL unused containers, images, and volumes

# Or clean up specific items
docker volume prune -f
docker image prune -a -f
```

---

### 🔴 CAUSE 3: Schema Loading Timeout
**Symptoms:**
- Container crashes during initial startup
- Logs show partial schema execution
- Happens only on first run

**Solution:**
The schema has 181 tables which takes 60-90 seconds to load.

✅ **ALREADY FIXED** in updated docker-compose.yml:
- Increased healthcheck `start_period: 120s`
- Increased timeouts to `10s`
- Increased retries to `10`

```powershell
# Apply the fix
git pull origin main
docker-compose down
docker-compose up -d
```

---

### 🔴 CAUSE 4: Corrupted MySQL Data Volume
**Symptoms:**
- Container keeps restarting
- Logs show "innodb" errors or corruption messages
- Happens after system crash or forced shutdown

**Solution:**
```powershell
# OPTION A: Repair the database (try this first)
docker-compose down
docker-compose up db
# Watch logs for repair messages

# OPTION B: Fresh database (LOSES ALL DATA)
docker-compose down -v
docker-compose up -d
# Database will reinitialize with default data
```

---

### 🔴 CAUSE 5: Port Conflict (3307)
**Symptoms:**
- Container fails to start
- Logs show "Address already in use"

**Solution:**
```powershell
# Check if port 3307 is in use
netstat -ano | findstr :3307

# Kill the process using the port (replace <PID> with actual PID)
taskkill /PID <PID> /F

# Or change the port in docker-compose.yml
# Change "3307:3306" to "3308:3306"
```

---

### 🔴 CAUSE 6: MySQL Configuration Too Aggressive
**Symptoms:**
- Container runs for a few minutes then crashes
- High memory usage before crash

**Solution:**
✅ **ALREADY FIXED** in updated docker-compose.yml:
- `innodb_buffer_pool_size=512M` (reduced for Windows)
- `max_connections=200` (reasonable limit)
- `max_allowed_packet=64M` (for large queries)

```powershell
# Apply the fix
git pull origin main
docker-compose down
docker-compose up -d
```

---

## Diagnostic Commands

### Run the diagnostic script:
```powershell
cd C:\vtria-erp
.\diagnose-db-crash.ps1
```

### Manual diagnostics:
```powershell
# 1. Check container status
docker-compose ps

# 2. View recent logs
docker-compose logs --tail=100 db

# 3. Check for errors
docker-compose logs db | Select-String -Pattern "ERROR"

# 4. Check exit code
docker inspect vtria-erp-db-1 --format='{{.State.ExitCode}}'

# 5. Check system resources
docker stats --no-stream

# 6. Check MySQL process inside container
docker-compose exec db ps aux
```

---

## Step-by-Step Fix Procedure

### Step 1: Apply Latest Fixes
```powershell
cd C:\vtria-erp
git pull origin main
```

### Step 2: Restart with New Configuration
```powershell
# Stop all containers
docker-compose down

# Start with logs visible
docker-compose up
```

**Watch for:**
- ✅ "ready for connections" - MySQL started successfully
- ❌ "Killed" - Out of memory
- ❌ "ERROR" - Configuration or corruption issue

### Step 3: If Still Crashing
```powershell
# Stop containers
docker-compose down

# Check Docker Desktop settings
# Resources → Memory: Set to 6GB minimum
# Resources → Disk: Ensure 20GB+ free space

# Remove volumes and start fresh (LOSES DATA)
docker volume rm vtria-erp_mysql_data
docker-compose up -d
```

### Step 4: Verify Database Health
```powershell
# Wait 2 minutes for schema to load
Start-Sleep -Seconds 120

# Check if database is up
docker-compose exec db mysqladmin ping -u vtria_user -pdev_password

# Verify table count
docker-compose exec db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='vtria_erp';"
# Should show: 181

# Check database size
docker-compose exec db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT table_schema, ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size(MB)' FROM information_schema.tables WHERE table_schema='vtria_erp' GROUP BY table_schema;"
```

---

## Improved Configuration (Already Applied)

### MySQL Memory Settings:
```yaml
command: >
  --max_connections=200              # Limit concurrent connections
  --innodb_buffer_pool_size=512M     # Reduced for Windows
  --innodb_log_file_size=128M        # Transaction log size
  --max_allowed_packet=64M           # Max query size
  --wait_timeout=600                 # Keep connections alive 10min
  --interactive_timeout=600          # Interactive session timeout
```

### Healthcheck Improvements:
```yaml
healthcheck:
  interval: 10s          # Check every 10s (was 5s)
  timeout: 10s           # Allow 10s for response (was 5s)
  retries: 10            # Try 10 times before failing (was 5)
  start_period: 120s     # Wait 120s before checking (NEW - for schema load)
```

### Auto-Restart:
```yaml
restart: unless-stopped  # Auto-restart on crash
```

---

## Exit Code Meanings

| Exit Code | Meaning | Solution |
|-----------|---------|----------|
| 0 | Clean exit | Normal shutdown |
| 1 | Application error | Check MySQL logs |
| 137 | OOM Killed | Increase Docker memory |
| 139 | Segmentation fault | Corrupted data, recreate volume |
| 143 | SIGTERM | Manual stop or timeout |

---

## Prevention Tips

### 1. Regular Monitoring
```powershell
# Monitor container health
docker-compose ps

# Monitor resource usage
docker stats --no-stream
```

### 2. Regular Backups
```powershell
# Backup database (run weekly)
docker-compose exec db mysqldump -u vtria_user -pdev_password vtria_erp > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

### 3. Clean Docker Resources
```powershell
# Monthly cleanup
docker system prune -f
```

### 4. Keep Docker Desktop Updated
- Check for updates regularly
- Update to latest stable version

---

## Quick Reference Card

| Problem | Quick Fix |
|---------|-----------|
| Container won't start | `docker-compose down && docker-compose up -d` |
| Container keeps restarting | `docker-compose logs db` (check errors) |
| Out of memory | Docker Desktop → Increase Memory to 6GB |
| Disk full | `docker system prune -a --volumes` |
| Corrupted data | `docker-compose down -v && docker-compose up -d` |
| Port conflict | Change port in docker-compose.yml |

---

## Getting Help

If issues persist after following this guide:

1. **Run diagnostics:**
   ```powershell
   .\diagnose-db-crash.ps1 > diagnostics.txt
   ```

2. **Collect information:**
   - Docker Desktop version
   - Windows version
   - Available RAM
   - Available disk space
   - `diagnostics.txt` output
   - Last 200 lines of database logs

3. **Share the diagnostic output** for detailed analysis

---

## Success Indicators

✅ Database is healthy when you see:

```powershell
docker-compose ps
# db shows "healthy"

docker-compose logs db | Select-String "ready for connections"
# Shows "ready for connections" message

docker-compose exec db mysqladmin ping -u vtria_user -pdev_password
# Shows "mysqld is alive"
```

---

## Related Files
- `docker-compose.yml` - Container configuration
- `diagnose-db-crash.ps1` - Automated diagnostics
- `sql/schema/00-complete_schema.sql` - Database schema (181 tables)

---

**Last Updated:** November 6, 2025  
**Status:** Configuration improvements applied to prevent crashes
