# Attendance Management - Employee Dropdown Empty Issue

## 🐛 Problem
Employee dropdown is empty in Mark Attendance dialog despite having 3 employees in the database.

## 🔍 Root Cause Analysis

### API Logs Show:
```
ERROR: Authentication error:
ERROR: Error on GET /api/employees:
```

### What's Happening:
1. Frontend makes request: `GET /api/employees?status=active`
2. API route requires authentication: `authMiddleware.verifyToken`
3. Authentication fails with "Authentication error"
4. Endpoint returns 401/500, frontend catch block triggers
5. Mock data fallback is used BUT never set to state properly

### SQL Query Works:
```sql
SELECT e.*, d.department_name 
FROM employees e 
LEFT JOIN departments d ON e.department_id = d.id 
WHERE e.status = 'active';
```
Returns 3 employees successfully - database is fine!

### The Issue:
The `vtria_token` in localStorage is either:
- Missing
- Invalid
- Expired
- Not being sent correctly in the Authorization header

## ✅ Solution

### Option 1: Check Browser Console (Recommended First)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error: "Error fetching employees: ..."
4. Go to Network tab
5. Find the request to `/api/employees?status=active`
6. Check:
   - Request Headers → Authorization header present?
   - Response → Status code (401/403/500)?
   - Response → Error message

### Option 2: Fix Mock Data Fallback
The component has mock data but it's not working because the `if (response.ok)` check fails and the mock data assignment is inside the catch block but after console.error.

**Current Code (lines 148-165)**:
```typescript
const fetchEmployees = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/employees?status=active`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      setEmployees(result.data);
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
    // Mock data for demo
    setEmployees([
      { id: 1, employee_id: 'EMP/2024/001', first_name: 'John', last_name: 'Doe' },
      { id: 2, employee_id: 'EMP/2024/002', first_name: 'Jane', last_name: 'Smith' }
    ]);
  }
};
```

**Problem**: If response is not ok (401), it doesn't throw an error, so catch block never runs!

**Fix**: Add error handling for non-OK responses:

```typescript
const fetchEmployees = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/employees?status=active`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      setEmployees(result.data || []);
    } else {
      // Response not OK, fetch from database directly or use fallback
      console.warn('Failed to fetch employees, using fallback data');
      // For now, set empty array and log the issue
      console.error(`Employee fetch failed with status: ${response.status}`);
      setEmployees([]);
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
    setEmployees([]);
  }
};
```

### Option 3: Make Endpoint Public (Quick Fix for Testing)
If this is just for testing attendance management, we can make the employees list endpoint public.

**File**: `api/src/routes/employee.routes.js` line 212

**Change**:
```javascript
// Remove authMiddleware.verifyToken temporarily
router.get('/', employeeController.getAllEmployees);
```

But this is NOT recommended for production!

### Option 4: Login Again (If Token Expired)
1. Go to http://localhost/vtria-erp/login
2. Login with: admin@vtria.com / admin123
3. Navigate back to attendance management
4. Try again

## 🧪 Quick Test

### Test 1: Check Token in Browser
Open browser console and run:
```javascript
localStorage.getItem('vtria_token')
```

Expected: Should return a JWT token string  
If null/undefined: You need to login again

### Test 2: Check Token Validity
```javascript
const token = localStorage.getItem('vtria_token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token expires:', new Date(payload.exp * 1000));
  console.log('Token expired?', Date.now() > payload.exp * 1000);
}
```

### Test 3: Manual API Call
Open browser console:
```javascript
fetch('http://localhost:3001/api/employees?status=active', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('vtria_token')}`
  }
})
.then(r => r.json())
.then(d => console.log('Employees:', d))
.catch(e => console.error('Error:', e));
```

## 📝 Recommended Fix

**Update AttendanceManagement.tsx lines 148-165:**

```typescript
const fetchEmployees = async () => {
  try {
    const token = localStorage.getItem('vtria_token');
    if (!token) {
      console.warn('No auth token found - user may need to login');
      setEmployees([]);
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/employees?status=active`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Failed to fetch employees: ${response.status}`, errorData);
      
      if (response.status === 401) {
        console.warn('Authentication failed - user may need to login again');
      }
      
      setEmployees([]);
      return;
    }

    const result = await response.json();
    setEmployees(result.data || []);
    
  } catch (error) {
    console.error('Error fetching employees:', error);
    setEmployees([]);
  }
};
```

## 🎯 Expected Outcome

After fix:
- If token is valid → Dropdown shows 3 employees
- If token is missing/invalid → Console shows clear error message + empty dropdown
- User knows they need to login

## 🚀 Immediate Action

**Quick Fix to Unblock Testing:**

1. **Verify you're logged in**:
   - Go to http://localhost/vtria-erp/
   - If redirected to login, login again
   - Then navigate to attendance management

2. **Or apply the code fix above** to get better error messages

3. **Or temporarily remove auth** from the employee list endpoint (line 212 in employee.routes.js)

---

**Status**: Issue identified - Authentication token problem, not a database or query issue.
