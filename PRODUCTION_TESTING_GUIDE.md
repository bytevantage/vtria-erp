# Production Module Testing Guide

## Overview
This guide provides step-by-step instructions for testing all three Production dashboards: Quality Control, Shop Floor Control, and Production Planning.

**Testing Date:** October 12, 2025  
**Application URL:** http://localhost:3000/vtria-erp  
**Backend API:** http://localhost:3001/api/production

---

## Prerequisites

### 1. Verify Services Running
```bash
# Check if React dev server is running (port 3000)
lsof -ti:3000

# Check if backend API is running (port 3001)
docker ps | grep vtria-erp-api

# Check if MySQL database is running
docker ps | grep vtria-erp-db
```

### 2. Test Credentials
- **Email:** test.payroll@vtria.com
- **Password:** [Your test password]

---

## Test Plan

## Phase 1: Login and Navigation (5 minutes)

### Step 1.1: Login
1. Open http://localhost:3000/vtria-erp in browser
2. Enter test credentials
3. Click "Sign In"
4. **Expected:** Successfully logged in and redirected to dashboard

### Step 1.2: Navigate to Manufacturing Menu
1. Locate "Manufacturing" menu item in left sidebar
2. Click on "Manufacturing" to expand sub-menu
3. **Expected:** See 4 menu items:
   - Production Management
   - Quality Control
   - Shop Floor Control
   - Production Planning

---

## Phase 2: Quality Control Dashboard Testing (15 minutes)

### Access the Dashboard
1. Click "Quality Control" in Manufacturing sub-menu
2. **Expected Route:** /production/quality
3. **Expected:** Dashboard loads with 4 KPI cards at top

### Test 2.1: KPI Cards Display
**Verify the following KPI cards are visible:**
- [ ] Total Inspections (number)
- [ ] Pass Rate (percentage)
- [ ] Total Defects (number)
- [ ] Critical Defects (number)

### Test 2.2: Inspections Tab
1. Ensure "Inspections" tab is selected (should be default)
2. **Expected:** Table with inspection records
3. **Columns to verify:**
   - Inspection ID
   - Product
   - Batch Number
   - Inspector
   - Inspection Date
   - Result (Pass/Fail/Conditional)
   - Defects Found
   - Notes
   - Status (Draft/Submitted/Approved/Rejected)
   - Actions

#### Test 2.2.1: Create New Inspection
1. Click "Create Inspection" button (top right)
2. **Expected:** Dialog opens with form
3. Fill in the form:
   - Product: [Select from dropdown or type]
   - Batch Number: TEST-BATCH-001
   - Inspector: John Smith
   - Inspection Date: [Today's date]
   - Checkpoint: [Select from dropdown]
   - Result: Pass
   - Defects Found: 0
   - Notes: "Test inspection for quality verification"
   - Status: Draft
4. Click "Create" button
5. **Expected:** 
   - Dialog closes
   - Success message appears
   - New inspection appears in table
   - KPI cards update

#### Test 2.2.2: Status Color Coding
**Verify status colors:**
- [ ] Draft = Orange
- [ ] Submitted = Blue
- [ ] Approved = Green
- [ ] Rejected = Red

#### Test 2.2.3: Result Color Coding
**Verify result colors:**
- [ ] Pass = Green
- [ ] Fail = Red
- [ ] Conditional = Orange

### Test 2.3: Quality Checkpoints Tab
1. Click "Quality Checkpoints" tab
2. **Expected:** Table with checkpoint configurations
3. **Columns to verify:**
   - Checkpoint Name
   - Type (Visual/Measurement/Functional/Safety)
   - Description
   - Tolerance Range
   - Severity (Critical/Major/Minor)
   - Status (Active/Inactive)

#### Test 2.3.1: Create New Checkpoint
1. Click "Create Checkpoint" button
2. Fill in the form:
   - Checkpoint Name: Surface Finish Check
   - Type: Visual
   - Description: Inspect surface finish quality
   - Tolerance Range: ±0.5mm
   - Severity: Major
   - Status: Active
3. Click "Create" button
4. **Expected:** New checkpoint appears in table

### Test 2.4: Defect Types Tab
1. Click "Defect Types" tab
2. **Expected:** Table with defect type configurations
3. **Columns to verify:**
   - Defect Type
   - Category (Critical/Major/Minor/Cosmetic)
   - Description
   - Status

#### Test 2.4.1: Create New Defect Type
1. Click "Create Defect Type" button
2. Fill in the form:
   - Defect Type: Surface Scratch
   - Category: Minor
   - Description: Minor surface scratches
   - Status: Active
3. Click "Create" button
4. **Expected:** New defect type appears in table

### Test 2.5: Analytics Tab
1. Click "Analytics" tab
2. **Expected:** Placeholder message: "Analytics charts will be displayed here. This section will include quality trends, defect analysis, and pass/fail rates over time."
3. **Note:** Charts will be added in Phase 2 enhancement

---

## Phase 3: Shop Floor Control Dashboard Testing (15 minutes)

### Access the Dashboard
1. Click "Shop Floor Control" in Manufacturing sub-menu
2. **Expected Route:** /production/shopfloor
3. **Expected:** Dashboard loads with 4 KPI cards and auto-refresh notice

### Test 3.1: Auto-Refresh Feature
1. Note the alert at top: "Dashboard auto-refreshes every 30 seconds"
2. **Expected:** Dashboard data refreshes automatically every 30 seconds
3. Watch for refresh indicator (loading state)

### Test 3.2: KPI Cards Display
**Verify the following KPI cards:**
- [ ] Total Machines (with Active count in green)
- [ ] Average Utilization (percentage)
- [ ] Operations Today (Completed/Total)
- [ ] Maintenance (count of machines in maintenance/breakdown)

### Test 3.3: Machines Tab
1. Ensure "Machines" tab is selected (should be default)
2. **Expected:** Table with machine records
3. **Columns to verify:**
   - Machine Code
   - Machine Type
   - Status (Running/Paused/Maintenance/Breakdown)
   - Current Operation
   - Location
   - Last Maintenance
   - Actions

#### Test 3.3.1: Create New Machine
1. Click "Add Machine" button
2. Fill in the form:
   - Machine Code: TEST-CNC-001
   - Machine Type: CNC (select from dropdown)
   - Status: Running
   - Location: Shop Floor A
   - Last Maintenance: [Today's date]
3. Click "Create" button
4. **Expected:** New machine appears in table

#### Test 3.3.2: Status Icons
**Verify status icons:**
- [ ] Running = Green PlayArrow icon
- [ ] Paused = Orange Pause icon
- [ ] Breakdown = Red Stop icon

#### Test 3.3.3: Machine Types Available
**Verify all machine types in dropdown:**
- [ ] CNC
- [ ] Lathe
- [ ] Mill
- [ ] Drill
- [ ] Grinder
- [ ] Welding
- [ ] Assembly
- [ ] Testing
- [ ] Other

### Test 3.4: Utilization Tab
1. Click "Real-time Utilization" tab
2. **Expected:** Table with utilization records
3. **Columns to verify:**
   - Machine Code
   - Status (Running/Idle/Maintenance/Breakdown/Setup)
   - Start Time
   - Duration
   - Operator
   - Actions

#### Test 3.4.1: Log New Utilization
1. Click "Log Utilization" button
2. Fill in the form:
   - Machine: [Select from dropdown]
   - Status: Running
   - Operator: John Doe
   - Start Time: [Current time]
3. Click "Log" button
4. **Expected:** New utilization record appears in table

### Test 3.5: Operations Tab
1. Click "Operations Tracking" tab
2. **Expected:** Table with operation records
3. **Columns to verify:**
   - Operation ID
   - Machine Code
   - Product
   - Quantity
   - Status (Started/In Progress/Completed/On Hold)
   - Start Time
   - End Time
   - Operator
   - Notes

#### Test 3.5.1: Start New Operation
1. Click "Start Operation" button
2. Fill in the form:
   - Machine: [Select from dropdown]
   - Product: Test Product
   - Quantity: 100
   - Operator: John Doe
   - Notes: Test operation
3. Click "Start" button
4. **Expected:** New operation appears in table with "Started" status

### Test 3.6: Performance Tab
1. Click "Performance" tab
2. **Expected:** Placeholder message for performance analytics
3. **Note:** Performance charts will be added in Phase 2

---

## Phase 4: Production Planning Dashboard Testing (15 minutes)

### Access the Dashboard
1. Click "Production Planning" in Manufacturing sub-menu
2. **Expected Route:** /production/planning
3. **Expected:** Dashboard loads with 4 KPI cards

### Test 4.1: KPI Cards Display
**Verify the following KPI cards:**
- [ ] Active Schedules (number out of total)
- [ ] Average OEE (percentage)
- [ ] Waste Cost (Monthly in ₹)
- [ ] Schedule Performance (On-track/Delayed count)

### Test 4.2: Production Schedules Tab
1. Ensure "Production Schedules" tab is selected
2. **Expected:** Table with schedule records
3. **Columns to verify:**
   - Schedule ID
   - Product
   - Type (Daily/Weekly/Monthly/Custom)
   - Target Quantity
   - Progress (progress bar)
   - Start Date
   - End Date
   - Status (Active/Completed/On Hold)

#### Test 4.2.1: Create New Schedule
1. Click "Create Schedule" button
2. Fill in the form:
   - Product: Test Product XYZ
   - Type: Daily
   - Target Quantity: 500
   - Actual Quantity: 0
   - Start Date: [Today]
   - End Date: [Tomorrow]
3. Click "Create" button
4. **Expected:** 
   - New schedule appears in table
   - Progress bar shows 0%
   - Status is "Active"

#### Test 4.2.2: Progress Bar Visualization
**Verify progress calculation:**
- Formula: (Actual Quantity / Target Quantity) × 100
- [ ] 0% = Red color
- [ ] 1-50% = Orange color
- [ ] 51-99% = Blue color
- [ ] 100% = Green color

### Test 4.3: Waste Tracking Tab
1. Click "Waste Tracking" tab
2. **Expected:** Table with waste records
3. **Columns to verify:**
   - Date
   - Category
   - Material
   - Quantity
   - Unit
   - Unit Cost (₹)
   - Total Cost (₹)
   - Reason

#### Test 4.3.1: Record New Waste
1. Click "Record Waste" button
2. Fill in the form:
   - Category: [Select from dropdown]
   - Material: Steel Sheets
   - Quantity: 10
   - Unit: kg
   - Unit Cost: 50
   - Reason: Material defect
3. Click "Record" button
4. **Expected:**
   - New waste record appears
   - Total Cost auto-calculated (Quantity × Unit Cost)
   - Waste Cost KPI updates

#### Test 4.3.2: Waste Categories
**Verify all waste categories available:**
- [ ] Scrap
- [ ] Rework
- [ ] Defective Material
- [ ] Overproduction
- [ ] Expired Material
- [ ] Other

### Test 4.4: OEE Analytics Tab
1. Click "OEE Analytics" tab
2. **Expected:** Table with OEE records
3. **Columns to verify:**
   - Date
   - Machine
   - Availability (%)
   - Performance (%)
   - Quality (%)
   - OEE (%)
   - Target OEE (%)
   - Variance
   - Actions

#### Test 4.4.1: Calculate New OEE
1. Click "Calculate OEE" button
2. **Expected:** Comprehensive dialog with 12 input fields in 3 sections

**Fill in OEE Calculation Form:**

**Availability Metrics:**
- Planned Production Time: 480 (minutes)
- Downtime: 30 (minutes)
- Operating Time: 450 (auto-calculated: 480 - 30)

**Performance Metrics:**
- Ideal Cycle Time: 2 (minutes per unit)
- Total Units Produced: 200

**Quality Metrics:**
- Good Units: 190
- Total Units: 200

3. Click "Calculate OEE" button
4. **Expected:**
   - OEE calculated automatically using formula:
     - Availability = (Operating Time / Planned Time) × 100
     - Performance = (Ideal Cycle Time × Total Units) / Operating Time × 100
     - Quality = (Good Units / Total Units) × 100
     - OEE = Availability × Performance × Quality / 10000
   - New OEE record appears in table
   - Average OEE KPI updates

#### Test 4.4.2: OEE Color Coding
**Verify OEE vs Target color coding:**
- [ ] OEE >= Target = Green
- [ ] OEE < Target = Red

### Test 4.5: Capacity Planning Tab
1. Click "Capacity Planning" tab
2. **Expected:** Placeholder message for capacity planning tools
3. **Note:** Advanced capacity planning will be added in Phase 2

---

## Phase 5: Integration Testing (10 minutes)

### Test 5.1: Navigation Between Dashboards
1. Navigate: Quality Control → Shop Floor Control → Production Planning
2. **Expected:** Smooth transitions, no errors, data persists

### Test 5.2: Data Consistency
1. Create an inspection in Quality Control
2. Navigate to Shop Floor Control
3. Navigate back to Quality Control
4. **Expected:** Inspection still visible in table

### Test 5.3: Responsive Design (Optional)
1. Resize browser window to different widths:
   - Desktop (1920px)
   - Tablet (768px)
   - Mobile (375px)
2. **Expected:** Layout adjusts appropriately

### Test 5.4: Error Handling
1. Turn off backend API: `docker stop vtria-erp-api-1`
2. Try to create a new record in any dashboard
3. **Expected:** Error message displayed gracefully
4. Restart API: `docker start vtria-erp-api-1`
5. Retry the operation
6. **Expected:** Works successfully

---

## Phase 6: Backend API Verification (10 minutes)

### Test 6.1: Quality Endpoints
```bash
# Get all checkpoints
curl -X GET http://localhost:3001/api/production/quality/checkpoints

# Get all defect types
curl -X GET http://localhost:3001/api/production/quality/defect-types

# Get quality metrics
curl -X GET http://localhost:3001/api/production/quality/metrics/dashboard
```

### Test 6.2: Shop Floor Endpoints
```bash
# Get all machines
curl -X GET http://localhost:3001/api/production/shopfloor/machines

# Get dashboard metrics
curl -X GET http://localhost:3001/api/production/shopfloor/dashboard

# Get machine utilization
curl -X GET http://localhost:3001/api/production/shopfloor/utilization
```

### Test 6.3: Planning Endpoints
```bash
# Get all schedules
curl -X GET http://localhost:3001/api/production/planning/schedules

# Get waste categories
curl -X GET http://localhost:3001/api/production/planning/waste/categories

# Get OEE records
curl -X GET http://localhost:3001/api/production/planning/oee/records
```

---

## Test Results Template

### Summary
- **Tester:** [Your Name]
- **Date:** October 12, 2025
- **Time:** [Start Time] - [End Time]
- **Browser:** [Browser Name & Version]
- **Overall Result:** ☑ Pass / ☐ Fail / ☐ Partial

### Detailed Results

#### Quality Control Dashboard
| Test Case | Status | Notes |
|-----------|--------|-------|
| KPI Cards Display | ☐ Pass ☐ Fail | |
| Inspections Tab | ☐ Pass ☐ Fail | |
| Create Inspection | ☐ Pass ☐ Fail | |
| Checkpoints Tab | ☐ Pass ☐ Fail | |
| Create Checkpoint | ☐ Pass ☐ Fail | |
| Defect Types Tab | ☐ Pass ☐ Fail | |
| Create Defect Type | ☐ Pass ☐ Fail | |
| Analytics Tab | ☐ Pass ☐ Fail | |

#### Shop Floor Control Dashboard
| Test Case | Status | Notes |
|-----------|--------|-------|
| Auto-Refresh | ☐ Pass ☐ Fail | |
| KPI Cards Display | ☐ Pass ☐ Fail | |
| Machines Tab | ☐ Pass ☐ Fail | |
| Add Machine | ☐ Pass ☐ Fail | |
| Utilization Tab | ☐ Pass ☐ Fail | |
| Log Utilization | ☐ Pass ☐ Fail | |
| Operations Tab | ☐ Pass ☐ Fail | |
| Start Operation | ☐ Pass ☐ Fail | |
| Performance Tab | ☐ Pass ☐ Fail | |

#### Production Planning Dashboard
| Test Case | Status | Notes |
|-----------|--------|-------|
| KPI Cards Display | ☐ Pass ☐ Fail | |
| Schedules Tab | ☐ Pass ☐ Fail | |
| Create Schedule | ☐ Pass ☐ Fail | |
| Progress Bars | ☐ Pass ☐ Fail | |
| Waste Tracking Tab | ☐ Pass ☐ Fail | |
| Record Waste | ☐ Pass ☐ Fail | |
| OEE Analytics Tab | ☐ Pass ☐ Fail | |
| Calculate OEE | ☐ Pass ☐ Fail | |
| Capacity Planning Tab | ☐ Pass ☐ Fail | |

#### Integration Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| Navigation | ☐ Pass ☐ Fail | |
| Data Consistency | ☐ Pass ☐ Fail | |
| Responsive Design | ☐ Pass ☐ Fail | |
| Error Handling | ☐ Pass ☐ Fail | |

### Issues Found
| # | Dashboard | Severity | Description | Steps to Reproduce |
|---|-----------|----------|-------------|-------------------|
| 1 | | High/Medium/Low | | |
| 2 | | High/Medium/Low | | |

### Recommendations
1. 
2. 
3. 

---

## Known Limitations (Expected for Phase 1)

1. **Analytics Tabs:** Charts not yet implemented (placeholder messages displayed)
   - Quality Control Analytics
   - Shop Floor Performance
   - Planning Capacity Planning

2. **Export Functions:** Export buttons visible but not yet functional
   - Will be implemented in Phase 2 with PDF/Excel libraries

3. **Real-time Features:** Basic polling (30s refresh) implemented
   - WebSocket integration planned for Phase 3

4. **Advanced Features:** Not yet implemented
   - Predictive analytics
   - AI-powered recommendations
   - Mobile app integration

---

## Next Steps After Testing

### If All Tests Pass:
1. ✅ Mark Production Module as production-ready
2. Move to Phase 2: Charts & Visualization
3. Or move to next module (Inventory/Sales/Procurement)

### If Issues Found:
1. Document all issues in the table above
2. Prioritize by severity (High/Medium/Low)
3. Fix critical issues before proceeding
4. Re-test after fixes

---

## Quick Reference

### URLs
- **Frontend:** http://localhost:3000/vtria-erp
- **Backend API:** http://localhost:3001/api/production
- **Quality API:** http://localhost:3001/api/production/quality
- **Shop Floor API:** http://localhost:3001/api/production/shopfloor
- **Planning API:** http://localhost:3001/api/production/planning

### Useful Commands
```bash
# Check React server
lsof -ti:3000

# Check backend API
docker ps | grep vtria-erp-api

# Restart backend
docker restart vtria-erp-api-1

# View backend logs
docker logs vtria-erp-api-1 -f --tail 100

# Stop/Start MySQL
docker stop vtria-erp-db-1
docker start vtria-erp-db-1
```

### Test Data
- **Inspector Names:** John Smith, Jane Doe, Mike Johnson
- **Operators:** John Doe, Mike Wilson, Sarah Brown
- **Products:** Test Product, Widget A, Component B
- **Machine Codes:** TEST-CNC-001, TEST-LAT-002, TEST-MIL-003

---

## Support

For any issues or questions during testing:
1. Check backend logs: `docker logs vtria-erp-api-1 -f`
2. Check browser console for JavaScript errors (F12 → Console)
3. Verify API connectivity: `curl http://localhost:3001/api/production/quality/checkpoints`
4. Refer to PRODUCTION_ENHANCEMENTS_DOCUMENTATION.md for API details
5. Refer to PRODUCTION_FRONTEND_COMPLETE.md for component details

---

**Happy Testing! 🚀**
