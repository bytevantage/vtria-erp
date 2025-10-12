#!/bin/bash

# Test script for Production Enhancements API
BASE_URL="http://localhost:3001/api/production"

echo "=========================================="
echo "Testing Production Enhancement APIs"
echo "=========================================="
echo ""

# First, login to get a token
echo "1. Logging in to get authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test.payroll@vtria.com","password":"TestPayroll@2025"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Successfully logged in"
echo ""

# ============================================================================
# QUALITY CONTROL TESTS
# ============================================================================
echo "=========================================="
echo "QUALITY CONTROL MODULE"
echo "=========================================="
echo ""

echo "2. Testing GET /quality/checkpoints..."
CHECKPOINTS=$(curl -s -X GET "$BASE_URL/quality/checkpoints" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $CHECKPOINTS"
CHECKPOINT_COUNT=$(echo $CHECKPOINTS | grep -o '"id"' | wc -l)
echo "Found $CHECKPOINT_COUNT quality checkpoints"
echo ""

echo "3. Testing GET /quality/defect-types..."
DEFECT_TYPES=$(curl -s -X GET "$BASE_URL/quality/defect-types" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $DEFECT_TYPES"
DEFECT_COUNT=$(echo $DEFECT_TYPES | grep -o '"id"' | wc -l)
echo "Found $DEFECT_COUNT defect types"
echo ""

echo "4. Testing GET /quality/inspections..."
INSPECTIONS=$(curl -s -X GET "$BASE_URL/quality/inspections" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $INSPECTIONS"
echo ""

# ============================================================================
# SHOP FLOOR CONTROL TESTS
# ============================================================================
echo "=========================================="
echo "SHOP FLOOR CONTROL MODULE"
echo "=========================================="
echo ""

echo "5. Testing GET /shopfloor/machines..."
MACHINES=$(curl -s -X GET "$BASE_URL/shopfloor/machines" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $MACHINES"
MACHINE_COUNT=$(echo $MACHINES | grep -o '"id"' | wc -l)
echo "Found $MACHINE_COUNT production machines"
echo ""

# ============================================================================
# PRODUCTION PLANNING TESTS
# ============================================================================
echo "=========================================="
echo "PRODUCTION PLANNING MODULE"
echo "=========================================="
echo ""

echo "6. Testing GET /planning/waste-categories..."
WASTE_CATEGORIES=$(curl -s -X GET "$BASE_URL/planning/waste-categories" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $WASTE_CATEGORIES"
WASTE_COUNT=$(echo $WASTE_CATEGORIES | grep -o '"id"' | wc -l)
echo "Found $WASTE_COUNT waste categories"
echo ""

echo "7. Testing GET /planning/schedule..."
SCHEDULE=$(curl -s -X GET "$BASE_URL/planning/schedule" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $SCHEDULE"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Quality Checkpoints: $CHECKPOINT_COUNT"
echo "Defect Types: $DEFECT_COUNT"
echo "Production Machines: $MACHINE_COUNT"
echo "Waste Categories: $WASTE_COUNT"
echo ""
echo "✅ All tests completed!"
