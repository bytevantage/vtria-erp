# Production Module - Quick Test Checklist

## 🎯 Quick Start
1. ✅ Open: http://localhost:3000/vtria-erp
2. ✅ Login: test.payroll@vtria.com
3. ✅ Click: Manufacturing → Quality Control

---

## 📋 Quality Control Dashboard (15 min)

### KPI Cards
- [ ] Total Inspections displays
- [ ] Pass Rate shows percentage
- [ ] Total Defects displays
- [ ] Critical Defects displays

### Inspections Tab
- [ ] Table loads with data
- [ ] Click "Create Inspection" button
- [ ] Fill form and submit
- [ ] New inspection appears
- [ ] Status colors correct (Draft=Orange, Submitted=Blue, Approved=Green, Rejected=Red)

### Checkpoints Tab
- [ ] Click "Quality Checkpoints" tab
- [ ] Table loads
- [ ] Click "Create Checkpoint"
- [ ] Fill: Surface Finish Check, Visual, Major, Active
- [ ] Submit and verify appears

### Defect Types Tab
- [ ] Click "Defect Types" tab
- [ ] Table loads
- [ ] Click "Create Defect Type"
- [ ] Fill: Surface Scratch, Minor, Active
- [ ] Submit and verify appears

### Analytics Tab
- [ ] Click "Analytics" tab
- [ ] Placeholder message shows (charts coming in Phase 2)

---

## 🏭 Shop Floor Control Dashboard (15 min)

### Navigate
- [ ] Click: Manufacturing → Shop Floor Control

### Auto-Refresh
- [ ] Alert shows: "Dashboard auto-refreshes every 30 seconds"
- [ ] Wait 30 seconds and see refresh happen

### KPI Cards
- [ ] Total Machines (Active count in green)
- [ ] Average Utilization percentage
- [ ] Operations Today (Completed/Total)
- [ ] Maintenance count displays

### Machines Tab
- [ ] Table loads
- [ ] Click "Add Machine"
- [ ] Fill: TEST-CNC-001, CNC, Running, Shop Floor A
- [ ] Submit and verify appears
- [ ] Status icons correct (Running=Green Play, Paused=Orange Pause, Breakdown=Red Stop)

### Utilization Tab
- [ ] Click "Real-time Utilization"
- [ ] Table loads
- [ ] Click "Log Utilization"
- [ ] Fill: Machine, Running, John Doe
- [ ] Submit and verify appears

### Operations Tab
- [ ] Click "Operations Tracking"
- [ ] Table loads
- [ ] Click "Start Operation"
- [ ] Fill: Machine, Test Product, 100, John Doe
- [ ] Submit and verify appears

### Performance Tab
- [ ] Click "Performance"
- [ ] Placeholder message shows

---

## 📊 Production Planning Dashboard (15 min)

### Navigate
- [ ] Click: Manufacturing → Production Planning

### KPI Cards
- [ ] Active Schedules (X of Y)
- [ ] Average OEE percentage
- [ ] Waste Cost Monthly (₹)
- [ ] Schedule Performance (On-track/Delayed)

### Schedules Tab
- [ ] Table loads
- [ ] Click "Create Schedule"
- [ ] Fill: Test Product XYZ, Daily, 500, 0, Today, Tomorrow
- [ ] Submit and verify appears
- [ ] Progress bar shows (0% should be red)

### Waste Tracking Tab
- [ ] Click "Waste Tracking"
- [ ] Table loads
- [ ] Click "Record Waste"
- [ ] Fill: Category, Steel Sheets, 10 kg, ₹50
- [ ] Total Cost auto-calculates (500)
- [ ] Submit and verify appears

### OEE Analytics Tab
- [ ] Click "OEE Analytics"
- [ ] Table loads
- [ ] Click "Calculate OEE"
- [ ] Fill all 12 fields:
  - Planned Time: 480
  - Downtime: 30
  - Operating Time: 450 (auto)
  - Cycle Time: 2
  - Units Produced: 200
  - Good Units: 190
  - Total Units: 200
- [ ] Click Calculate
- [ ] OEE calculated and appears
- [ ] Color coding correct (Green if ≥ target, Red if < target)

### Capacity Planning Tab
- [ ] Click "Capacity Planning"
- [ ] Placeholder message shows

---

## 🔄 Integration Tests (10 min)

### Navigation
- [ ] Go: Quality → Shop Floor → Planning
- [ ] All transitions smooth
- [ ] No errors in browser console (F12)

### Data Persistence
- [ ] Create item in Quality
- [ ] Navigate to Shop Floor
- [ ] Navigate back to Quality
- [ ] Item still visible

### Responsive Design
- [ ] Resize browser window
- [ ] Layout adjusts properly
- [ ] All elements visible

### Error Handling
- [ ] Stop backend: `docker stop vtria-erp-api-1`
- [ ] Try to create item
- [ ] Error message displays gracefully
- [ ] Start backend: `docker start vtria-erp-api-1`
- [ ] Retry operation - works

---

## 🔧 Backend API Tests (5 min)

Run these commands in terminal:

```bash
# Quality
curl http://localhost:3001/api/production/quality/metrics/dashboard

# Shop Floor
curl http://localhost:3001/api/production/shopfloor/dashboard

# Planning
curl http://localhost:3001/api/production/planning/schedules
```

- [ ] Quality API returns JSON
- [ ] Shop Floor API returns JSON
- [ ] Planning API returns JSON

---

## ✅ Final Checks

### No Errors
- [ ] No browser console errors
- [ ] No red text in React terminal
- [ ] No 404 errors in Network tab (F12 → Network)

### All Features Work
- [ ] Can create records in all 3 dashboards
- [ ] All KPIs display numbers
- [ ] All tables show data
- [ ] All dialogs open/close
- [ ] All forms submit successfully

### Expected Limitations (OK if not working)
- [ ] Analytics charts (placeholders only) - EXPECTED
- [ ] Export buttons (visible but inactive) - EXPECTED
- [ ] WebSocket real-time (using 30s polling) - EXPECTED

---

## 📝 Issues Found

| Dashboard | Issue | Severity |
|-----------|-------|----------|
|           |       | H/M/L    |
|           |       | H/M/L    |
|           |       | H/M/L    |

---

## 🎉 Testing Complete!

### If All Pass:
- ✅ Production Module is PRODUCTION READY (95%)
- ✅ Move to Phase 2: Add Charts
- ✅ Or move to next module

### If Issues Found:
- 📝 Document in table above
- 🔧 Fix critical issues first
- 🔄 Re-test after fixes

---

## Time Taken
- Start: _____
- End: _____
- Total: _____ minutes

## Overall Result
- ☐ PASS - Ready for production
- ☐ PASS WITH MINOR ISSUES - Deploy with notes
- ☐ FAIL - Needs fixes before deployment

---

**Tester:** _______________  
**Date:** October 12, 2025  
**Browser:** _______________  
**Signature:** _______________
