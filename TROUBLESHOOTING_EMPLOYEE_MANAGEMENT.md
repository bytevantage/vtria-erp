# 🔧 Troubleshooting: Employee Management Page

**Issue:** Employee Management shows "No employees found" but Dashboard shows 3 employees

**Date:** October 12, 2025  
**Status:** DEBUGGING

---

## 🐛 Problem Analysis

The `/employee-management` page is not displaying employees while `/employee-dashboard` shows 3 employees correctly.

### Possible Causes:
1. ❌ Filter parameter mismatch (`employment_status` vs `is_active`)
2. ❌ API response format mismatch
3. ❌ Authentication/authorization issue
4. ❌ Component state not updating

---

## ✅ Fixes Applied

### Fix #1: Changed Filter Parameter
**Issue:** Component was using `employment_status: 'active'` but API expects `is_active: 'true'`

```javascript
// Before:
const [filters, setFilters] = useState({
  employment_status: 'active',  // ❌ Wrong parameter
  ...
});

// After:
const [filters, setFilters] = useState({
  is_active: 'true',  // ✅ Correct parameter
  ...
});
```

### Fix #2: Added Debug Logging
**Added console logs to track API calls:**

```javascript
console.log('Loading employees from:', `/api/users/with-hr?${params}`);
console.log('Employee API response:', response.data);
console.log('Loaded employees:', response.data.users?.length || 0);
```

### Fix #3: Removed Duplicate Pagination State
**Removed duplicate pagination declaration**

### Fix #4: Better Error Handling
**Enhanced error messages to show response details**

```javascript
setError('Failed to load employees: ' + (error.response?.data?.message || error.message));
console.error('Error response:', error.response?.data);
```

---

## 🧪 How to Test

### Step 1: Clear Browser Cache
```
1. Open Developer Tools (F12)
2. Right-click Refresh button
3. Select "Empty Cache and Hard Reload"
```

### Step 2: Check Console
```
1. Open Developer Tools (F12)
2. Go to Console tab
3. Navigate to: http://localhost/vtria-erp/employee-management
4. Look for:
   - "Loading employees from: /api/users/with-hr?..."
   - "Employee API response: {success: true, users: [...]}"
   - "Loaded employees: 3"
```

### Step 3: Check Network Tab
```
1. Open Developer Tools (F12)
2. Go to Network tab
3. Navigate to: http://localhost/vtria-erp/employee-management
4. Find request to: /api/users/with-hr
5. Check:
   - Status Code: Should be 200
   - Response: Should show success: true, users: [...]
```

---

## 🔍 Expected API Call

### URL:
```
GET /api/users/with-hr?search=&department_id=&is_active=true&employee_type=&page=1&limit=20
```

### Expected Response:
```json
{
  "success": true,
  "users": [
    {
      "id": 3,
      "employee_id": "EMP0003",
      "email": "admin@vtria.com",
      "first_name": "System",
      "last_name": "Administrator",
      "user_role": "director",
      "status": "active",
      "is_active": true,
      ...
    },
    {
      "id": 4,
      "employee_id": "EMP0004",
      ...
    },
    {
      "id": 5,
      "employee_id": "EMP0005",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "pages": 1
  }
}
```

---

## 🚨 Common Issues & Solutions

### Issue #1: 401 Unauthorized
**Symptom:** API returns 401 error

**Solution:**
```
1. Check if you're logged in
2. Check localStorage has authToken
3. Try logging out and back in
```

### Issue #2: 404 Not Found
**Symptom:** API endpoint not found

**Solution:**
```bash
# Check if backend is running
docker-compose ps

# Check backend logs
docker-compose logs api | tail -50

# Restart backend
docker-compose restart api
```

### Issue #3: Empty Response
**Symptom:** API returns success but users array is empty

**Solution:**
```bash
# Check database directly
docker exec -it vtria-erp-db-1 mysql -u vtria_user -pdev_password vtria_erp

# Run query:
SELECT id, employee_id, first_name, last_name, email, is_active 
FROM users 
WHERE is_active = TRUE;

# Should show 3 rows
```

### Issue #4: CORS Error
**Symptom:** Browser console shows CORS error

**Solution:**
```
Check if API_BASE_URL is configured correctly in frontend
Should be proxied through nginx or use relative URLs
```

---

## 📊 Debug Checklist

- [ ] Browser cache cleared
- [ ] Console shows API call being made
- [ ] Network tab shows 200 response
- [ ] Response contains users array with 3 items
- [ ] is_active filter is set to 'true' (not 'active')
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Database has 3 users with is_active=TRUE

---

## 🔄 After Fixes - Restart Steps

```bash
# Navigate to project
cd /Users/srbhandary/Documents/Projects/vtria-erp

# Restart frontend (already done)
docker-compose restart client

# Wait for restart
sleep 5

# Check logs
docker-compose logs client | tail -20
```

---

## 📝 What to Report

If issue persists, report:

1. **Console Output:**
   - Copy all console.log messages
   - Copy any errors

2. **Network Request:**
   - URL called
   - Request parameters
   - Response status code
   - Response body

3. **Backend Logs:**
```bash
docker-compose logs api | grep "users/with-hr"
```

---

## ✅ Expected Outcome

After refresh, Employee Management page should show:

```
┌─────────────────────────────────────────┐
│  Employee Management                    │
├─────────────────────────────────────────┤
│  [Add Employee] [Export] [Filter]       │
│                                         │
│  Employees (3)                          │
│  ┌────────────────────────────────┐    │
│  │ EMP0003  System Administrator  │    │
│  │ director  admin@vtria.com      │    │
│  │ [Edit] [View]                  │    │
│  ├────────────────────────────────┤    │
│  │ EMP0004  VTRIA Director        │    │
│  │ director  director@vtria.com   │    │
│  │ [Edit] [View]                  │    │
│  ├────────────────────────────────┤    │
│  │ EMP0005  Production Manager    │    │
│  │ admin  manager@vtria.com       │    │
│  │ [Edit] [View]                  │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

**Status:** Fixes applied, client restarted  
**Next:** Refresh page and check browser console
