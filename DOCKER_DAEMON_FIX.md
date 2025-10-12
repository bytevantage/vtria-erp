# 🔧 REAL FIX: Docker Daemon Connection Issue

## Actual Problem Identified

Docker Desktop is running BUT the Docker daemon socket is not accessible. This is why you're seeing:
```
Cannot connect to the Docker daemon at unix:///Users/srbhandary/.docker/run/docker.sock
Is the docker daemon running?
```

---

## ✅ Solution: Fix Docker Daemon Access

### Option 1: Restart Docker Desktop (Quick Fix - 2 minutes)

**Step 1: Quit Docker Desktop Completely**
```bash
# Kill all Docker processes
pkill -9 Docker

# Wait 5 seconds
sleep 5
```

**Step 2: Restart Docker Desktop**
```bash
# Start Docker Desktop
open -a Docker

# Wait 60-90 seconds for full initialization
sleep 90
```

**Step 3: Verify Docker Works**
```bash
# This should now work without errors
docker ps

# Should show container list (even if empty)
```

**Step 4: Start Backend Services**
```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp

# Start database
docker start vtria-erp-db-1
sleep 15

# Start API
docker start vtria-erp-api-1
sleep 15

# Test API
curl http://localhost:3001/api/production/quality/checkpoints
```

---

### Option 2: Run Backend Without Docker (Alternative - 5 minutes)

If Docker continues to have issues, you can run the backend directly:

**Step 1: Install MySQL Locally**
```bash
# Using Homebrew (if you have it)
brew install mysql

# Start MySQL
brew services start mysql

# Create database and user
mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS vtria_erp;
CREATE USER IF NOT EXISTS 'vtria_user'@'localhost' IDENTIFIED BY 'dev_password';
GRANT ALL PRIVILEGES ON vtria_erp.* TO 'vtria_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

**Step 2: Import Database Schema**
```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp

# Import all SQL files (adjust path as needed)
mysql -u vtria_user -pdev_password vtria_erp < path/to/schema.sql
```

**Step 3: Start Backend API Directly**
```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp/api

# Start the backend server
npm start
```

The API should now be running on http://localhost:3001

---

### Option 3: Fix Docker Desktop Settings (Permanent Fix - 5 minutes)

**Step 1: Check Docker Desktop Settings**
1. Open Docker Desktop
2. Click the **gear icon** (Settings)
3. Go to **Advanced** or **Resources**
4. Check if there are any error messages

**Step 2: Reset Docker Desktop**
1. In Settings, go to **Troubleshoot**
2. Click **"Reset to factory defaults"**
3. Confirm the reset
4. Wait for Docker to restart (can take 2-3 minutes)
5. Docker will ask for your password - enter it

**Step 3: Restart Your Containers**
After reset, you'll need to recreate containers:
```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp

# Use docker-compose to create and start everything
docker-compose up -d
```

---

## 🎯 Recommended Approach

**For Immediate Testing: Option 1 (Restart Docker)**

This is fastest and will likely fix the socket connection issue.

```bash
# Complete command sequence:
pkill -9 Docker && sleep 5 && open -a Docker && \
echo "⏳ Waiting 90 seconds for Docker to start..." && sleep 90 && \
docker ps && \
echo "✅ Docker is accessible!" && \
cd /Users/srbhandary/Documents/Projects/vtria-erp && \
docker start vtria-erp-db-1 && sleep 15 && \
docker start vtria-erp-api-1 && sleep 15 && \
curl http://localhost:3001/api/production/quality/checkpoints && \
echo "\n✅ Backend API is running!"
```

---

## 🔍 Diagnosing the Issue

### Why This Happened

Docker Desktop on macOS uses a Linux VM to run containers. The socket file `/Users/srbhandary/.docker/run/docker.sock` is how the `docker` CLI communicates with the daemon. 

Common causes:
- Docker Desktop didn't fully initialize after system update/restart
- Socket permissions changed
- Docker Desktop version incompatibility
- Corrupted Docker Desktop installation

### Check Your Docker Version
```bash
# In Docker Desktop window, look at bottom left corner
# Should show version like: Docker Desktop 4.x.x
```

---

## ✅ Verification Steps

After applying any fix, verify everything works:

### 1. Docker Daemon Accessible
```bash
docker ps
# Should NOT show socket error
```

### 2. Database Running
```bash
docker ps | grep vtria-erp-db
# Should show: vtria-erp-db-1   Up X seconds
```

### 3. API Running
```bash
docker ps | grep vtria-erp-api
# Should show: vtria-erp-api-1   Up X seconds
```

### 4. API Responding
```bash
curl http://localhost:3001/api/production/quality/checkpoints
# Should return JSON data
```

### 5. Frontend Connected
- Open: http://localhost:3000/vtria-erp
- Check connection status
- Should show: ✅ API Connected

---

## 🆘 If Nothing Works

### Last Resort: Complete Reinstall

1. **Uninstall Docker Desktop**
   - Drag Docker.app to Trash
   - Remove: `~/Library/Group Containers/group.com.docker`
   - Remove: `~/Library/Containers/com.docker.docker`
   - Empty Trash

2. **Download Fresh Copy**
   - Go to: https://www.docker.com/products/docker-desktop
   - Download for macOS (Apple Silicon or Intel)
   - Install and start

3. **Recreate Containers**
   ```bash
   cd /Users/srbhandary/Documents/Projects/vtria-erp
   docker-compose up -d
   ```

---

## 📊 Quick Decision Tree

```
Docker Desktop running? YES
  ↓
Can you run `docker ps`? NO ← YOU ARE HERE
  ↓
Try Option 1: Restart Docker Desktop
  ↓
Works? NO
  ↓
Try Option 3: Reset Docker Desktop
  ↓
Works? NO
  ↓
Try Option 2: Run backend without Docker
  OR
  Complete reinstall
```

---

## 💡 Prevention

After fixing, set these to avoid future issues:

1. **Docker Desktop Settings:**
   - Settings → General → ✅ Start Docker Desktop when you log in
   - Settings → Resources → Increase memory to 4GB+

2. **Check Docker Status Before Coding:**
   ```bash
   # Add this to your startup routine
   docker ps || echo "Docker needs attention!"
   ```

---

## 🚀 Expected Outcome

After the fix:

```bash
$ docker ps
CONTAINER ID   IMAGE         STATUS         PORTS                    NAMES
abc123def      mysql:8.0     Up 2 minutes   0.0.0.0:3306->3306/tcp  vtria-erp-db-1
def456ghi      node:20       Up 2 minutes   0.0.0.0:3001->3001/tcp  vtria-erp-api-1

$ curl http://localhost:3001/api/production/quality/checkpoints
{"success":true,"data":[...]}

Browser: ✅ API Connected
```

---

**Start with Option 1 (restart Docker Desktop) - that fixes 90% of these issues!**
