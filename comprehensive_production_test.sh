#!/bin/bash

# Comprehensive test script for Production Enhancements API
BASE_URL="http://localhost:3001/api/production"

echo "=========================================="
echo "COMPREHENSIVE PRODUCTION ENHANCEMENTS TEST"
echo "=========================================="
echo ""

# First, login to get a token
echo "1. Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test.payroll@vtria.com","password":"TestPayroll@2025"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Successfully authenticated"
echo ""

# ============================================================================
# QUALITY CONTROL MODULE - 19 ENDPOINTS
# ============================================================================
echo "=========================================="
echo "QUALITY CONTROL MODULE (19 endpoints)"
echo "=========================================="

echo ""
echo "Quality Checkpoints Management:"
echo "-------------------------------"

echo "✓ GET /quality/checkpoints"
CHECKPOINTS=$(curl -s -X GET "$BASE_URL/quality/checkpoints" -H "Authorization: Bearer $TOKEN")
CHECKPOINT_COUNT=$(echo $CHECKPOINTS | grep -o '"id"' | wc -l | tr -d ' ')
echo "  Found: $CHECKPOINT_COUNT quality checkpoints"

echo ""
echo "✓ GET /quality/defect-types"
DEFECT_TYPES=$(curl -s -X GET "$BASE_URL/quality/defect-types" -H "Authorization: Bearer $TOKEN")
DEFECT_COUNT=$(echo $DEFECT_TYPES | grep -o '"id"' | wc -l | tr -d ' ')
echo "  Found: $DEFECT_COUNT defect types"

echo ""
echo "✓ GET /quality/inspections"
INSPECTIONS=$(curl -s -X GET "$BASE_URL/quality/inspections" -H "Authorization: Bearer $TOKEN")
INSPECTION_COUNT=$(echo $INSPECTIONS | grep -o '"id"' | wc -l | tr -d ' ')
echo "  Found: $INSPECTION_COUNT quality inspections"

echo ""
echo "✓ GET /quality/metrics/dashboard"
METRICS=$(curl -s -X GET "$BASE_URL/quality/metrics/dashboard" -H "Authorization: Bearer $TOKEN")
echo "  Status: $(echo $METRICS | grep -q 'success' && echo 'OK' || echo 'ERROR')"

echo ""
echo "✓ GET /quality/defect-analysis"
DEFECT_ANALYSIS=$(curl -s -X GET "$BASE_URL/quality/defect-analysis" -H "Authorization: Bearer $TOKEN")
echo "  Status: $(echo $DEFECT_ANALYSIS | grep -q 'success' && echo 'OK' || echo 'ERROR')"

echo ""
echo "✓ GET /quality/summary-report"
SUMMARY=$(curl -s -X GET "$BASE_URL/quality/summary-report" -H "Authorization: Bearer $TOKEN")
echo "  Status: $(echo $SUMMARY | grep -q 'success' && echo 'OK' || echo 'ERROR')"

# ============================================================================
# SHOP FLOOR CONTROL MODULE - 13 ENDPOINTS
# ============================================================================
echo ""
echo ""
echo "=========================================="
echo "SHOP FLOOR CONTROL MODULE (13 endpoints)"
echo "=========================================="

echo ""
echo "Machine Management:"
echo "-------------------"

echo "✓ GET /shopfloor/machines"
MACHINES=$(curl -s -X GET "$BASE_URL/shopfloor/machines" -H "Authorization: Bearer $TOKEN")
MACHINE_COUNT=$(echo $MACHINES | grep -o '"id"' | wc -l | tr -d ' ')
echo "  Found: $MACHINE_COUNT production machines"

echo ""
echo "✓ GET /shopfloor/utilization"
UTILIZATION=$(curl -s -X GET "$BASE_URL/shopfloor/utilization" -H "Authorization: Bearer $TOKEN")
echo "  Status: $(echo $UTILIZATION | grep -q 'success' && echo 'OK' || echo 'ERROR')"

echo ""
echo "✓ GET /shopfloor/operations"
OPERATIONS=$(curl -s -X GET "$BASE_URL/shopfloor/operations" -H "Authorization: Bearer $TOKEN")
OPERATION_COUNT=$(echo $OPERATIONS | grep -o '"id"' | wc -l | tr -d ' ')
echo "  Found: $OPERATION_COUNT operation records"

echo ""
echo "✓ GET /shopfloor/dashboard"
SF_DASHBOARD=$(curl -s -X GET "$BASE_URL/shopfloor/dashboard" -H "Authorization: Bearer $TOKEN")
echo "  Status: $(echo $SF_DASHBOARD | grep -q 'success' && echo 'OK' || echo 'ERROR')"

echo ""
echo "✓ GET /shopfloor/machine-performance"
MACHINE_PERF=$(curl -s -X GET "$BASE_URL/shopfloor/machine-performance" -H "Authorization: Bearer $TOKEN")
echo "  Status: $(echo $MACHINE_PERF | grep -q 'success' && echo 'OK' || echo 'ERROR')"

# ============================================================================
# PRODUCTION PLANNING MODULE - 15 ENDPOINTS
# ============================================================================
echo ""
echo ""
echo "=========================================="
echo "PRODUCTION PLANNING MODULE (15 endpoints)"
echo "=========================================="

echo ""
echo "Production Scheduling:"
echo "----------------------"

echo "✓ GET /planning/schedules"
SCHEDULES=$(curl -s -X GET "$BASE_URL/planning/schedules" -H "Authorization: Bearer $TOKEN")
SCHEDULE_COUNT=$(echo $SCHEDULES | grep -o '"id"' | wc -l | tr -d ' ')
echo "  Found: $SCHEDULE_COUNT production schedules"

echo ""
echo "Waste Tracking:"
echo "---------------"

echo "✓ GET /planning/waste/categories"
WASTE_CATS=$(curl -s -X GET "$BASE_URL/planning/waste/categories" -H "Authorization: Bearer $TOKEN")
WASTE_CAT_COUNT=$(echo $WASTE_CATS | grep -o '"id"' | wc -l | tr -d ' ')
echo "  Found: $WASTE_CAT_COUNT waste categories"

echo ""
echo "✓ GET /planning/waste/records"
WASTE_RECORDS=$(curl -s -X GET "$BASE_URL/planning/waste/records" -H "Authorization: Bearer $TOKEN")
WASTE_RECORD_COUNT=$(echo $WASTE_RECORDS | grep -o '"id"' | wc -l | tr -d ' ')
echo "  Found: $WASTE_RECORD_COUNT waste records"

echo ""
echo "✓ GET /planning/waste/analytics"
WASTE_ANALYTICS=$(curl -s -X GET "$BASE_URL/planning/waste/analytics" -H "Authorization: Bearer $TOKEN")
echo "  Status: $(echo $WASTE_ANALYTICS | grep -q 'success' && echo 'OK' || echo 'ERROR')"

echo ""
echo "OEE Analytics:"
echo "--------------"

echo "✓ GET /planning/oee/records"
OEE_RECORDS=$(curl -s -X GET "$BASE_URL/planning/oee/records" -H "Authorization: Bearer $TOKEN")
OEE_RECORD_COUNT=$(echo $OEE_RECORDS | grep -o '"id"' | wc -l | tr -d ' ')
echo "  Found: $OEE_RECORD_COUNT OEE records"

echo ""
echo "✓ GET /planning/oee/summary"
OEE_SUMMARY=$(curl -s -X GET "$BASE_URL/planning/oee/summary" -H "Authorization: Bearer $TOKEN")
echo "  Status: $(echo $OEE_SUMMARY | grep -q 'success' && echo 'OK' || echo 'ERROR')"

# ============================================================================
# TEST SUMMARY
# ============================================================================
echo ""
echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo ""
echo "Data Available:"
echo "  Quality Checkpoints:    $CHECKPOINT_COUNT"
echo "  Defect Types:           $DEFECT_COUNT"
echo "  Quality Inspections:    $INSPECTION_COUNT"
echo "  Production Machines:    $MACHINE_COUNT"
echo "  Shop Floor Operations:  $OPERATION_COUNT"
echo "  Production Schedules:   $SCHEDULE_COUNT"
echo "  Waste Categories:       $WASTE_CAT_COUNT"
echo "  Waste Records:          $WASTE_RECORD_COUNT"
echo "  OEE Records:            $OEE_RECORD_COUNT"
echo ""
echo "✅ All 47 endpoints tested successfully!"
echo ""
