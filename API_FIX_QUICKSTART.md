# 🚨 API CONNECTION ERROR - QUICK FIX

## Problem
```
❌ Connection Error: No API server found
❌ API Disconnected
```

## Root Cause
**Docker is not running** - The backend API runs in Docker containers, and Docker Desktop is currently not started.

---

## ✅ 3-Step Fix (5 minutes)

### Step 1: Start Docker Desktop ⚠️ REQUIRED

**Option A: Using Spotlight**
1. Press `Cmd + Space` to open Spotlight
2. Type: `Docker`
3. Click: `Docker Desktop`
4. Wait 30-60 seconds for the whale icon to appear in your menu bar

**Option B: Using Terminal**
```bash
open -a Docker
```

⏰ **WAIT** until the Docker icon in your menu bar stops animating (becomes stable).

---

### Step 2: Run Quick Start Script

Open a new terminal and run:

```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp
./quick_start.sh
```

This will:
- ✅ Verify Docker is running
- ✅ Start MySQL database
- ✅ Start Backend API
- ✅ Test API connectivity
- ✅ Show status of all services

**Expected Output:**
```
✓ Docker is running
✓ Containers exist
✓ Database is running
✓ Backend API is running
✓ API is responding!
🎉 Backend services are ready!
```

---

### Step 3: Refresh Your Browser

1. Go back to: http://localhost:3000/vtria-erp
2. Press: `Cmd + Shift + R` (hard refresh)
3. Check connection status
4. Should now show: **✅ API Connected**

---

## 🎯 Quick Commands

### All-in-One Command
```bash
# Start everything (after Docker Desktop is running)
cd /Users/srbhandary/Documents/Projects/vtria-erp && ./quick_start.sh
```

### Manual Commands (if script doesn't work)
```bash
# 1. Start database
docker start vtria-erp-db-1
sleep 15

# 2. Start API
docker start vtria-erp-api-1
sleep 15

# 3. Test API
curl http://localhost:3001/api/production/quality/checkpoints
```

---

## ✅ Verification

After following steps, verify:

```bash
# Check Docker containers
docker ps

# Should show:
# vtria-erp-db-1    Up X seconds    0.0.0.0:3306->3306/tcp
# vtria-erp-api-1   Up X seconds    0.0.0.0:3001->3001/tcp

# Test API directly
curl http://localhost:3001/api/production/quality/checkpoints

# Should return JSON data like:
# {"success":true,"data":[...]}
```

---

## 🆘 Still Not Working?

### Problem: Docker Desktop won't start
**Solution:** Restart your Mac, then try starting Docker Desktop again.

### Problem: "Cannot find container vtria-erp-api-1"
**Solution:** List all containers to find the correct name:
```bash
docker ps -a | grep vtria
```

Use the actual container names in the commands.

### Problem: API still not responding
**Solution:** Check the logs:
```bash
docker logs vtria-erp-api-1 --tail 50
```

Common issues:
- Database not ready: Wait 30 more seconds
- Port conflict: Kill process on port 3001
- Environment error: Check .env file

### Problem: React shows "Disconnected" even though API works
**Solution:**
1. Clear browser cache
2. Hard refresh: `Cmd + Shift + R`
3. Check browser console (F12) for errors

---

## 📞 Quick Reference

| Issue | Solution |
|-------|----------|
| Docker not running | `open -a Docker` then wait 60 seconds |
| Containers not starting | `docker ps -a` to see status, check logs |
| API not responding | Wait 30 more seconds, check logs |
| Frontend still disconnected | Hard refresh browser |

---

## 🎯 Expected Final State

```
✅ Docker Desktop: Running (whale icon in menu bar)
✅ vtria-erp-db-1: Up (MySQL on port 3306)
✅ vtria-erp-api-1: Up (Node.js API on port 3001)
✅ React Frontend: Running (port 3000)
✅ API Connection: Connected
✅ Status: Ready to test!
```

---

## 💡 For Next Time

To avoid this issue:

1. **Set Docker to auto-start:**
   - Open Docker Desktop
   - Go to: Settings → General
   - Check: ✅ "Start Docker Desktop when you log in"

2. **Always check services before testing:**
   ```bash
   ./quick_start.sh
   ```

---

## 🚀 Ready?

Once you've completed the 3 steps:

1. ✅ Docker Desktop running
2. ✅ Run `./quick_start.sh` 
3. ✅ Refresh browser

**Your API connection should work!**

Open: http://localhost:3000/vtria-erp

You should see: **✅ API Connected** 🎉
