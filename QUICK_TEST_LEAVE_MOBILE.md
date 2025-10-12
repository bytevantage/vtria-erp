# 🧪 Quick Test Guide - Leave Management & Mobile Attendance

**After Docker rebuild completes**, follow this quick testing guide.

---

## ⚡ Quick Start (5 minutes)

### Step 1: Restart Docker Containers
```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp
docker-compose up -d client
docker-compose restart api
```

### Step 2: Hard Refresh Browser
- **Mac**: `Cmd + Shift + R`
- **Windows**: `Ctrl + Shift + R`

### Step 3: Login
- URL: http://localhost/vtria-erp/login
- Email: `admin@vtria.com`
- Password: `admin123`

---

## 🎯 Test 1: Leave Management (3 minutes)

### URL: http://localhost/vtria-erp/leave-management

### Quick Checks:
1. **Page loads without errors** ✓
   - Open browser console (F12)
   - Should see: "Employees fetched successfully: 3"
   - No 401 errors

2. **Click "Apply for Leave" button** ✓
   - Dialog opens
   - Employee dropdown shows 3 employees
   - Leave type dropdown shows options

3. **Submit a leave application** ✓
   - Select employee: "System Administrator"
   - Select leave type: "Annual Leave"
   - Start date: Tomorrow
   - End date: 2 days from now
   - Reason: "Test leave application"
   - Click "Submit Application"
   - Should see success message (or alert)
   - Application appears in table

4. **Approve the application** ✓
   - Find your application in table
   - Click green checkmark (✓) button
   - Confirmation dialog appears
   - Click OK
   - Should see: "Leave application approved successfully!"
   - Status changes to "APPROVED"

### Success Criteria:
✅ No console errors  
✅ Employee dropdown populated  
✅ Can submit application  
✅ Can approve with confirmation  

---

## 🎯 Test 2: Mobile Attendance (3 minutes)

### URL: http://localhost/vtria-erp/mobile-attendance

### Quick Checks:
1. **Page loads with employee data** ✓
   - Should show real employee name (NOT "Demo User")
   - Employee ID displays
   - Department shows

2. **Get GPS location** ✓
   - Click "Get Current Location" button
   - Allow browser permission if prompted
   - Wait 3-5 seconds
   - Location info displays:
     - Coordinates
     - Accuracy (±Xm)
     - Distance from office
     - Status badge (within/outside geofence)

3. **Test geofence (if outside office)** ✓
   - If "Outside work location" shows:
   - Check-in button should be DISABLED
   - Error message: "You must be within a designated work location..."

4. **Mock location for testing** ✓
   - Open browser console (F12)
   - Paste this code to mock within-geofence location:
   ```javascript
   navigator.geolocation.getCurrentPosition = function(success) {
     success({
       coords: {
         latitude: 12.9141,
         longitude: 74.8560,
         accuracy: 10
       }
     });
   };
   ```
   - Click "Get Current Location" again
   - Should show "Within work location"
   - Check-in button ENABLED

5. **Check-in** ✓
   - Click check-in button
   - Should see success
   - Time displays
   - Late status shows if after 9:15 AM

### Success Criteria:
✅ Employee data loads from API  
✅ GPS location works  
✅ Geofence validation enforced  
✅ Check-in/check-out buttons work  

---

## 🐛 Troubleshooting

### If Employee Dropdown is Empty (Leave Management):
```javascript
// Open browser console (F12) and run:
localStorage.getItem('vtria_token')
```
- If returns `null`: Re-login required
- If returns token: Check API logs:
  ```bash
  docker-compose logs api --tail 50 | grep "employees"
  ```

### If Employee Shows "Demo User" (Mobile Attendance):
1. Check console for errors
2. Verify logged in
3. Test endpoint manually:
   ```bash
   # Get token from localStorage first
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/employees/current
   ```

### If Geofence Always Shows "Outside":
- Hardcoded locations in code:
  - Head Office: 12.9141, 74.8560 (100m radius)
  - Branch Office: 12.9160, 74.8570 (50m radius)
- To test: Use mock location code above

### API Errors:
```bash
# Check API logs
docker-compose logs api --tail 100

# Check for authentication errors
docker-compose logs api | grep "ERROR"

# Restart API if needed
docker-compose restart api
```

---

## 📊 Expected Console Messages

### Leave Management Console:
```
Employees fetched successfully: 3
```

### Mobile Attendance Console:
```
Employee data loaded: {id: 1, name: "...", employee_id: "..."}
Location acquired: {latitude: ..., longitude: ..., accuracy: ...}
Within geofence: true
Attendance recorded successfully
```

### API Logs (Good):
```
api-1  | INFO: GET /api/employees?status=active - 200 OK
api-1  | INFO: GET /api/employees/current - 200 OK
api-1  | INFO: POST /api/enhanced-attendance/record - 200 OK
```

---

## ✅ Quick Verification Checklist

After tests complete, verify:

- [ ] Leave Management page loads
- [ ] Employee dropdown works (3 employees)
- [ ] Can submit leave application
- [ ] Can approve/reject with confirmation
- [ ] Leave balances tab works
- [ ] Mobile Attendance page loads
- [ ] Employee data shows (not Demo User)
- [ ] GPS location works
- [ ] Geofence validation enforced
- [ ] Check-in button works (when in geofence)
- [ ] No 401 errors in console
- [ ] All API calls return 200 OK

---

## 📝 Test Results Template

Copy and fill this out:

```
=== Leave Management Test ===
Date: ___________
Tester: ___________

✓ Page loaded: YES / NO
✓ Employee dropdown: [ ] employees shown
✓ Leave application submitted: YES / NO
✓ Approval works: YES / NO
✓ Confirmation dialog: YES / NO
Issues found: ___________

=== Mobile Attendance Test ===
Date: ___________
Tester: ___________

✓ Page loaded: YES / NO
✓ Employee name: ___________
✓ GPS works: YES / NO
✓ Geofence validation: YES / NO
✓ Check-in works: YES / NO
Issues found: ___________

=== Overall ===
Authentication: WORKING / BROKEN
API Endpoints: WORKING / BROKEN
Ready for Production: YES / NO / NEEDS_FIXES
```

---

## 🚀 If All Tests Pass

1. **Commit changes to git**:
   ```bash
   git add -A
   git commit -m "Fix: Leave Management and Mobile Attendance authentication and API issues
   
   - Fixed authToken → vtria_token in both components
   - Added /api/employees/current endpoint
   - Fixed employee ID type issue (null → undefined)
   - Added geofence validation for check-out
   - Enhanced error handling and user feedback
   - Added confirmation dialogs for approve/reject
   - Improved loading states
   
   Tested:
   - Leave application submission ✓
   - Leave approval/rejection ✓
   - Mobile attendance check-in ✓
   - GPS geofencing ✓"
   ```

2. **Push to repository**:
   ```bash
   git push origin main
   ```

3. **Mark as production-ready** ✓

---

**Next**: After Docker rebuild completes, run through this test guide!
