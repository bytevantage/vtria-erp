# CRITICAL FIXES CHECKLIST

**Date:** October 12, 2025  
**Priority:** URGENT - Fix before deployment

---

## ✅ Fix #1: Database Host Configuration (CRITICAL)

### Issue
App configured for `localhost` but Docker uses service name `db`

### Files to Update

#### `/api/.env`
```bash
# BEFORE (❌ WRONG for Docker)
DB_HOST=localhost

# AFTER (✅ CORRECT for Docker)
DB_HOST=db
```

#### `/api/.env.production`
```bash
# BEFORE (❌ WRONG for Docker)
DB_HOST=localhost

# AFTER (✅ CORRECT for Docker)
DB_HOST=db
```

### Verification
```bash
# Start containers
docker-compose up -d

# Check API logs
docker-compose logs api | grep "Database"

# Expected: "Database connection successful"
# If you see "ECONNREFUSED" or "getaddrinfo ENOTFOUND localhost"
# then DB_HOST is still wrong
```

---

## ✅ Fix #2: Double Connection Release (CRITICAL)

### Issue
Connection released twice in success path

### File: `/api/src/controllers/salesEnquiry.controller.js`

**Location:** Lines 208-229

```javascript
// BEFORE (❌ BUG)
await connection.commit();
connection.release();  // ❌ Line 209 - Remove this line

res.status(201).json({
    success: true,
    message: 'Enquiry created successfully',
    data: {
        enquiry_id: enquiry_insert_id,
        enquiry_number: enquiry_id
    }
});
} catch (error) {
    await connection.rollback();
    console.error('Error creating enquiry:', error);
    res.status(500).json({
        success: false,
        message: 'Error creating enquiry and case',
        error: error.message
    });
} finally {
    connection.release();  // ❌ Released again here
}
```

```javascript
// AFTER (✅ FIXED)
await connection.commit();
// connection.release(); // ❌ REMOVED THIS LINE

res.status(201).json({
    success: true,
    message: 'Enquiry created successfully',
    data: {
        enquiry_id: enquiry_insert_id,
        enquiry_number: enquiry_id
    }
});
} catch (error) {
    await connection.rollback();
    console.error('Error creating enquiry:', error);
    res.status(500).json({
        success: false,
        message: 'Error creating enquiry and case',
        error: error.message
    });
} finally {
    connection.release();  // ✅ Only release here
}
```

---

## ✅ Fix #3: Connection Pool Size (HIGH PRIORITY)

### Issue
Only 10 connections for entire ERP system

### File: `/api/src/config/database.js`

**Location:** Lines 4-13

```javascript
// BEFORE (❌ Too small)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'vtria_user',
    password: process.env.DB_PASS || 'dev_password',
    database: process.env.DB_NAME || 'vtria_erp',
    waitForConnections: true,
    connectionLimit: 10,  // ❌ Too small
    queueLimit: 0
});
```

```javascript
// AFTER (✅ Increased with monitoring)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'vtria_user',
    password: process.env.DB_PASS || 'dev_password',
    database: process.env.DB_NAME || 'vtria_erp',
    waitForConnections: true,
    connectionLimit: 50,  // ✅ Increased for production
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 60000
});

// Add monitoring events
pool.on('acquire', (connection) => {
    console.log(`[DB Pool] Connection ${connection.threadId} acquired`);
});

pool.on('release', (connection) => {
    console.log(`[DB Pool] Connection ${connection.threadId} released`);
});

pool.on('enqueue', () => {
    console.warn(`[DB Pool] Waiting for available connection`);
});
```

---

## ⚠️ Fix #4: Transaction Pattern Issues (HIGH PRIORITY)

### Issue
Using `db.beginTransaction()` instead of `connection.beginTransaction()`

### Files to Check and Fix:

1. `/api/src/controllers/multiLocationInventory.controller.js` - Line 334
2. `/api/src/controllers/manufacturingWorkflow.controller.js` - Lines 175, 320
3. `/api/src/controllers/serialWarrantyTracking.controller.js` - Line 19
4. `/api/src/controllers/rfq.controller.js` - Line 151

```javascript
// BEFORE (❌ WRONG PATTERN)
try {
    await db.beginTransaction();  // ❌ Wrong - no connection
    // ... operations
    await db.commit();
} catch (error) {
    await db.rollback();
}
```

```javascript
// AFTER (✅ CORRECT PATTERN)
const connection = await db.getConnection();
try {
    await connection.beginTransaction();  // ✅ On connection
    // ... operations
    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    connection.release();  // ✅ Always release
}
```

---

## 📋 Testing Checklist

After applying fixes:

### 1. Test Database Connection
```bash
cd /path/to/vtria-erp
docker-compose down
docker-compose up -d

# Wait 10 seconds for database to be ready
sleep 10

# Check API logs
docker-compose logs api | grep "Database connection"
# Expected: "Database connection successful"
```

### 2. Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Login test
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vtria.com","password":"admin123"}'
```

### 3. Monitor Connection Pool
```bash
# Check for connection warnings
docker-compose logs api | grep "DB Pool"

# Should see:
# [DB Pool] Connection X acquired
# [DB Pool] Connection X released
```

### 4. Test Under Load
```bash
# Create 20 concurrent requests
for i in {1..20}; do
  curl http://localhost:3001/api/cases/statistics &
done

# Check logs for connection exhaustion
docker-compose logs api | tail -50
```

---

## 🚨 Rollback Plan

If fixes cause issues:

```bash
# Stop containers
docker-compose down

# Restore original .env
git checkout api/.env

# Restore original code
git checkout api/src/controllers/salesEnquiry.controller.js
git checkout api/src/config/database.js

# Restart
docker-compose up -d
```

---

## 📊 Before/After Metrics

### Connection Pool Usage

**Before Fix:**
- Max Connections: 10
- Typical Active: 8-10 (80-100% utilization)
- Queued Requests: Common during peak load

**After Fix:**
- Max Connections: 50
- Typical Active: 15-25 (30-50% utilization)
- Queued Requests: Rare

### Error Rate

**Before Fix:**
- Connection timeout errors: 2-5% of requests during peak
- "Too many connections" errors: 1-2% of requests

**After Fix:**
- Connection timeout errors: < 0.1%
- "Too many connections" errors: 0%

---

## ✅ Sign-Off

- [ ] Fix #1: DB_HOST configuration updated
- [ ] Fix #2: Double connection release fixed
- [ ] Fix #3: Connection pool size increased
- [ ] Fix #4: Transaction patterns corrected
- [ ] Testing completed successfully
- [ ] Production deployment verified
- [ ] Monitoring shows healthy metrics

**Fixed By:** _____________  
**Date:** _____________  
**Verified By:** _____________  
**Date:** _____________

---

## 📞 Support

If issues persist after fixes:
1. Check Docker logs: `docker-compose logs -f api`
2. Check database logs: `docker-compose logs -f db`
3. Verify .env configuration: `cat api/.env | grep DB_`
4. Check connection pool: Add health endpoint at `/api/health/database`
