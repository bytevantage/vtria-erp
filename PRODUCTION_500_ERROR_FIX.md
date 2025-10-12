# 🔴 Production Dashboard 500 Error - Authentication Issue

**Issue Reported**: `http://localhost/vtria-erp/production` - 500 Internal Server Error  
**Root Cause**: **Authentication Error** - Missing or invalid JWT token  
**Status**: 🔍 **INVESTIGATING**

---

## 🔍 Problem Analysis

### Error Messages (Browser Console)
```
[Error] Failed to load resource: the server responded with a status of 500 (Internal Server Error) (dashboard, line 0)
[Error] API Request Error: Request failed with status code 500
[Error] Error fetching dashboard data: AxiosError
```

### Error Messages (API Logs)
```
api-1  | === INCOMING REQUEST: GET /api/production/dashboard ===
api-1  | INFO: GET /api/production/dashboard
api-1  | ERROR: Authentication error:
api-1  | ERROR: Error on GET /api/production/dashboard:
```

### Root Cause
The error is **NOT a database error** - it's an **authentication error**!

The API endpoint requires authentication:
```javascript
// api/src/routes/production.routes.js:456
router.get('/dashboard', authMiddleware.verifyToken, productionController.getProductionDashboard);
```

But the request is being made without a valid JWT token, causing the authentication middleware to reject it with a 401/500 error.

---

## 🎯 Why This Happens

### Frontend Code (ProductionManagement.js)
```javascript
import { api } from '../utils/api';

const fetchDashboardData = async () => {
  try {
    const [dashResponse, casesResponse] = await Promise.all([
      api.get('/api/production/dashboard'),  // ❌ No explicit auth headers
      api.get('/api/production/cases')
    ]);
    // ...
  }
}
```

### API Utility (client/src/utils/api.js)
```javascript
export const apiRequest = async (method, endpoint, data = null, options = {}) => {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                ...options.headers  // ❌ Relies on axios defaults
            },
            ...options
        };
        
        // Uses global axios instance
        const response = await axios(config);  // ❌ Expects AuthContext to have set defaults
        return response.data;
    }
}
```

### AuthContext (client/src/contexts/AuthContext.js)
```javascript
// Sets axios defaults on mount
useEffect(() => {
    const token = localStorage.getItem('vtria_token');
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;  
        // ✅ Should work IF AuthContext mounted before ProductionManagement
    }
}, []);
```

### The Problem
1. **Timing Issue**: ProductionManagement might mount/fetch before AuthContext sets axios defaults
2. **Token Missing**: User might not be logged in (no `vtria_token` in localStorage)
3. **Token Expired**: Token might be expired or invalid
4. **Axios Instance Issue**: Using different axios instances

---

## ✅ Solutions

### Option 1: Add Explicit Auth Headers (Recommended)
Similar to other fixed components (PurchaseRequisition, Quotations, etc.):

**File**: `client/src/components/ProductionManagement.js`

```javascript
// Add at top of component (around line 70)
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('vtria_token') || 'demo-token'}`
});

// Update fetchDashboardData (around line 102)
const fetchDashboardData = async () => {
  try {
    const [dashResponse, casesResponse] = await Promise.all([
      api.get('/api/production/dashboard', { headers: authHeaders() }),  // ✅ Explicit auth
      api.get('/api/production/cases', { headers: authHeaders() })
    ]);
    // ...
  }
};

// Update ALL other API calls similarly
const fetchManufacturingUnits = async () => {
  const response = await api.get('/api/production/master/manufacturing-units', { headers: authHeaders() });
  // ...
};

const fetchOperations = async () => {
  const response = await api.get('/api/production/master/operations', { headers: authHeaders() });
  // ...
};

// ... and so on for ALL api.get(), api.post(), api.put(), api.delete() calls
```

### Option 2: Fix API Utility to Always Include Auth
**File**: `client/src/utils/api.js`

```javascript
export const apiRequest = async (method, endpoint, data = null, options = {}) => {
    try {
        // ✅ Always include auth token
        const token = localStorage.getItem('vtria_token');
        
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                ...(token && { 'Authorization': `Bearer ${token}` }),  // ✅ Add auth
                ...options.headers
            },
            ...options
        };

        if (data !== null && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            config.data = data;
            config.headers['Content-Type'] = 'application/json';
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
};
```

### Option 3: Add Token Validation Before API Call
**File**: `client/src/components/ProductionManagement.js`

```javascript
useEffect(() => {
    // ✅ Check auth before fetching
    const token = localStorage.getItem('vtria_token');
    if (!token) {
        console.error('No authentication token - redirecting to login');
        // Redirect to login or show error
        return;
    }
    
    fetchDashboardData();
    fetchManufacturingUnits();
    fetchOperations();
    fetchCategories();
    fetchReadyCases();
    fetchManufacturingCases();
  }, []);
```

---

## 🚀 Recommended Fix (Combination Approach)

### Step 1: Fix API Utility (Global Fix)
This fixes ALL components using the `api` utility:

```bash
# Edit: client/src/utils/api.js
# Add token to headers automatically
```

### Step 2: Add Validation in ProductionManagement
```bash
# Edit: client/src/components/ProductionManagement.js
# Check token exists before making API calls
```

### Step 3: Test
```bash
# 1. Rebuild client
docker-compose build client

# 2. Restart
docker-compose up -d

# 3. Login first
http://localhost/vtria-erp/login
Email: admin@vtria.com
Password: admin123

# 4. Test Production
http://localhost/vtria-erp/production
# Should load without 500 error
```

---

## 🧪 Testing Steps

### Verify Authentication
```javascript
// Browser console
localStorage.getItem('vtria_token')
// Should return a JWT token string, not null
```

### Check API Logs
```bash
docker-compose logs api | grep "production/dashboard"
# Should see: INFO: GET /api/production/dashboard
# Should NOT see: ERROR: Authentication error
```

### Network Tab
```
F12 → Network → Click request to /api/production/dashboard
→ Request Headers
→ Should see: Authorization: Bearer eyJ...
```

---

## 📊 Related Issues Fixed

This is the **same authentication pattern** as other recent fixes:
1. ✅ Enterprise Analytics - Added auth headers
2. ✅ Purchase Orders - Fixed API endpoint
3. ✅ Purchase Requisition - Added authHeaders()  
4. ✅ Quotations - Added authHeaders()
5. ✅ Leave Management - Fixed authToken → vtria_token
6. ✅ Mobile Attendance - Fixed authToken → vtria_token
7. ⏱️ **Production Dashboard** - Needs same fix

---

## 🎯 Prevention

To avoid similar issues in future:

1. **Always check token before API calls**:
   ```javascript
   const token = localStorage.getItem('vtria_token');
   if (!token) {
       // Handle no token case
       return;
   }
   ```

2. **Use consistent authentication pattern**:
   ```javascript
   const authHeaders = () => ({
       Authorization: `Bearer ${localStorage.getItem('vtria_token')}`
   });
   
   api.get(url, { headers: authHeaders() })
   ```

3. **OR fix the API utility globally** to always include token

4. **Test with Network tab** to verify Authorization header present

---

## 📝 Files to Modify

### Recommended: Fix API Utility (Option 2)
- `client/src/utils/api.js` - Add automatic token injection

### Alternative: Fix Component (Option 1)
- `client/src/components/ProductionManagement.js` - Add authHeaders() function and apply to all API calls (~20 locations)

### Additional:
- `api/src/controllers/production.controller.js` - Already has better error logging ✅

---

**Status**: 🔴 **NEEDS FIX**  
**Recommended**: Fix `api.js` utility to inject token automatically (Option 2)  
**Alternative**: Add `authHeaders()` to ProductionManagement component (Option 1)  

**Next Step**: Choose approach and implement fix
