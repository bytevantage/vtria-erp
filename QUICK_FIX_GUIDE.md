# Quick Fix Guide - Docker vs Development Server

## Current Situation
You're running VTRIA ERP in **Docker containers**, which serve a **built/compiled version** of the React app. The source code has been updated, but Docker is still serving the old built files.

## Two Options:

---

### Option 1: Rebuild Docker (PRODUCTION-READY)
**Use this for production-like testing**

```bash
# 1. Stop Docker
cd /Users/srbhandary/Documents/Projects/vtria-erp
docker-compose down

# 2. Rebuild client with latest code (takes 5-10 minutes)
docker-compose build --no-cache client

# 3. Start all services
docker-compose up -d

# 4. Access application
# http://localhost/vtria-erp/
```

**Status:** Build is currently running in the background (step 2)

---

### Option 2: Use Development Server (QUICK FOR TESTING)
**Use this for quick testing and development**

```bash
# 1. Stop Docker (frees up ports)
cd /Users/srbhandary/Documents/Projects/vtria-erp
docker-compose down

# 2. Start Backend API (keeps database running)
docker-compose up -d db redis
cd api
npm start  # Runs on port 3001

# 3. Start Frontend Dev Server (in new terminal)
cd client
npm start  # Runs on port 3000

# 4. Access application
# http://localhost:3000/
```

**Advantages:**
- ✅ Instant code changes (hot reload)
- ✅ No build time required
- ✅ Better for debugging
- ✅ See console logs directly

**Disadvantages:**
- ⚠️ Not production-ready
- ⚠️ Requires two terminal windows

---

## Error Analysis

### Errors You Saw:
```
http://localhost/vtria-erp/sales-enquiry
- Failed: /api/users/with-hr (500 error)

http://localhost/vtria-erp/production  
- Failed: /api/production/dashboard (500 error)

http://localhost/vtria-erp/financial-dashboard
- Failed: Various endpoints (401 unauthorized)
```

### Root Cause:
The Docker container is serving **old JavaScript files** (`main.78ac2fb3.js`) that still reference:
- `/api/users/with-hr` (old endpoint - doesn't exist)
- `/api/departments` (old endpoint - doesn't exist)

The source code was updated to use:
- `/api/employees` (new endpoint - working)
- `/api/employees/master/departments` (new endpoint - working)

But Docker hasn't rebuilt with the new code yet.

---

## Recommended Action

**FOR IMMEDIATE TESTING:**
```bash
# Terminal 1
docker-compose down
docker-compose up -d db redis
cd api && npm start

# Terminal 2  
cd client && npm start

# Open: http://localhost:3000/
```

**FOR PRODUCTION DEPLOYMENT:**
```bash
# Wait for current build to finish (shows "Successfully built")
# Then:
docker-compose up -d

# Open: http://localhost/vtria-erp/
```

---

## Files That Were Updated (Need Rebuild)

1. ✅ `client/src/components/EmployeeManagement.tsx`
2. ✅ `client/src/components/EmployeeDashboard.tsx`
3. ✅ `client/src/components/EnterpriseEmployeeManagement.js`
4. ✅ `client/src/components/SalesEnquiry.js`

All now use `/api/employees` instead of `/api/users/with-hr`

---

## How to Check Docker Build Status

```bash
# Check if build is complete
docker-compose ps

# If containers are running, check logs
docker-compose logs client

# If build failed, rebuild
docker-compose build --no-cache client
docker-compose up -d
```

---

## Summary

**Problem:** Docker serving old code  
**Solution:** Either rebuild Docker OR use dev server  
**Status:** Docker rebuild in progress (5-10 min)  
**Quick Test:** Use dev server with `npm start`
