# 🔧 Fix API Connection Error

## Issue Detected
```
❌ API Connection Status: Disconnected
❌ No API server found at http://localhost:3001
❌ Docker daemon is not running
```

---

## ✅ Solution: Start Docker and Backend Services

### Step 1: Start Docker Desktop (REQUIRED)

**macOS Instructions:**
1. Open **Spotlight** (Cmd + Space)
2. Type **"Docker"**
3. Click on **Docker Desktop**
4. Wait for Docker to start (whale icon in menu bar should be stable)
5. Verify: The Docker icon in your menu bar should NOT have loading animation

**Alternative:**
```bash
# Open Docker Desktop from terminal
open -a Docker
```

⏰ **Wait 30-60 seconds** for Docker to fully start before proceeding.

---

### Step 2: Verify Docker is Running

Run this command to check:
```bash
docker ps
```

**Expected Output:**
```
CONTAINER ID   IMAGE       COMMAND      CREATED       STATUS       PORTS      NAMES
```

If you see this (even if empty), Docker is running! ✅

If you see "Cannot connect to Docker daemon", Docker is NOT running yet. Wait longer.

---

### Step 3: Start Backend API Container

Once Docker is running, start the backend:

```bash
# Navigate to project directory
cd /Users/srbhandary/Documents/Projects/vtria-erp

# Start the backend API container
docker start vtria-erp-api-1

# Wait 10 seconds for it to start
sleep 10

# Verify it's running
docker ps | grep vtria-erp-api
```

**Expected Output:**
```
vtria-erp-api-1   Up 10 seconds   0.0.0.0:3001->3001/tcp
```

---

### Step 4: Start MySQL Database Container

The backend needs the database:

```bash
# Start MySQL container
docker start vtria-erp-db-1

# Wait 10 seconds for it to initialize
sleep 10

# Verify it's running
docker ps | grep vtria-erp-db
```

**Expected Output:**
```
vtria-erp-db-1    Up 10 seconds   0.0.0.0:3306->3306/tcp
```

---

### Step 5: Test Backend API

Test if the API is responding:

```bash
# Test quality endpoint
curl http://localhost:3001/api/production/quality/checkpoints

# Should return JSON data like:
# {"success":true,"data":[...]}
```

---

### Step 6: Refresh Your Browser

1. Go back to your browser at: http://localhost:3000/vtria-erp
2. **Hard refresh:** Cmd + Shift + R (macOS)
3. Check the connection status in the UI
4. Should now show: ✅ API Connected

---

## 🚀 Quick Fix Script

Run this all-in-one command:

```bash
# Make sure you're in the project directory
cd /Users/srbhandary/Documents/Projects/vtria-erp

# Start all containers
docker start vtria-erp-db-1 && \
docker start vtria-erp-api-1 && \
sleep 15 && \
echo "Testing API connection..." && \
curl -s http://localhost:3001/api/production/quality/checkpoints > /dev/null && \
echo "✅ Backend API is running!" || \
echo "❌ Backend API is not responding yet. Wait 30 more seconds and try again."
```

---

## 🔍 Troubleshooting

### Problem: Docker Desktop won't start
**Solution:**
1. Restart your Mac
2. Open Docker Desktop
3. If still failing, reinstall Docker Desktop from: https://www.docker.com/products/docker-desktop

### Problem: Containers don't exist
**Error:** `No such container: vtria-erp-api-1`

**Solution:** Check if containers exist with different names:
```bash
docker ps -a | grep vtria
```

If you see different names, use those names in the `docker start` command.

### Problem: Port 3001 already in use
**Solution:**
```bash
# Find what's using port 3001
lsof -ti:3001

# Kill the process (replace PID with the number from above)
kill -9 <PID>

# Restart the container
docker start vtria-erp-api-1
```

### Problem: Backend logs show errors
**Check logs:**
```bash
docker logs vtria-erp-api-1 --tail 50
```

Common errors:
- **Database connection failed:** Make sure vtria-erp-db-1 is running
- **Port already in use:** Kill the conflicting process
- **Environment variables missing:** Check .env file exists

### Problem: API responds but React still shows "Disconnected"
**Solution:**
1. Check React proxy configuration
2. Clear browser cache
3. Hard refresh (Cmd + Shift + R)
4. Check browser console for CORS errors

---

## 📋 Complete Startup Checklist

Run these commands in order:

```bash
# 1. Start Docker Desktop (manual step)
open -a Docker
sleep 30

# 2. Verify Docker is running
docker ps

# 3. Start MySQL database
docker start vtria-erp-db-1
sleep 10

# 4. Start Backend API
docker start vtria-erp-api-1
sleep 15

# 5. Test API
curl http://localhost:3001/api/production/quality/checkpoints

# 6. Check container status
docker ps --filter "name=vtria-erp"

# 7. If needed, view logs
docker logs vtria-erp-api-1 --tail 50
```

---

## ✅ Verification

After following the steps, verify everything is working:

### 1. Docker Running
```bash
docker ps
# Should show 2+ containers with "Up" status
```

### 2. Backend Responding
```bash
curl http://localhost:3001/api/production/quality/checkpoints
# Should return JSON data
```

### 3. Frontend Connected
- Open: http://localhost:3000/vtria-erp
- Check connection status (usually in app bar or settings)
- Should show: ✅ API Connected

---

## 🎯 Expected Final State

After successful fix:

```
✅ Docker Desktop: Running
✅ vtria-erp-db-1: Up (port 3306)
✅ vtria-erp-api-1: Up (port 3001)
✅ React Dev Server: Running (port 3000)
✅ API Connection: Connected
✅ Frontend: Can load data from backend
```

---

## 🆘 Still Not Working?

If you've tried everything and it's still not working:

1. **Check Docker Desktop Settings:**
   - Resources → Ensure enough memory allocated (4GB+)
   - Check if virtualization is enabled in BIOS

2. **Restart Everything:**
   ```bash
   # Stop all containers
   docker stop vtria-erp-api-1 vtria-erp-db-1
   
   # Restart Docker Desktop
   # (Quit Docker Desktop, then reopen it)
   
   # Start containers again
   docker start vtria-erp-db-1 && sleep 10
   docker start vtria-erp-api-1 && sleep 15
   ```

3. **Check Container Health:**
   ```bash
   docker inspect vtria-erp-api-1 | grep -A 5 "Health"
   docker inspect vtria-erp-db-1 | grep -A 5 "Health"
   ```

4. **Rebuild Containers (Last Resort):**
   ```bash
   cd /Users/srbhandary/Documents/Projects/vtria-erp
   docker-compose up -d --build
   ```

---

## 📞 Quick Reference

| Service | Port | Check Command |
|---------|------|---------------|
| Docker | - | `docker ps` |
| MySQL | 3306 | `docker ps \| grep vtria-erp-db` |
| Backend API | 3001 | `curl http://localhost:3001/api/production/quality/checkpoints` |
| React | 3000 | Browser: http://localhost:3000/vtria-erp |

---

## 💡 Prevention

To avoid this issue in the future:

1. **Always start Docker Desktop first** before working on the project
2. **Check services before testing:**
   ```bash
   ./start_production_testing.sh
   ```
3. **Set Docker Desktop to start at login:**
   - Docker Desktop → Preferences → General
   - ✅ Check "Start Docker Desktop when you log in"

---

**Once Docker is running and containers are started, your API connection should work! 🎉**

Return to your browser and refresh the page.
