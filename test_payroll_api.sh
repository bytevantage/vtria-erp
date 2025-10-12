#!/bin/bash

# Payroll API Testing Script
# This script tests all payroll endpoints systematically

BASE_URL="http://localhost:3001/api"
CONTENT_TYPE="Content-Type: application/json"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test results
print_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "=========================================="
echo "PAYROLL API TESTING SUITE"
echo "=========================================="
echo ""

# Step 1: Login and get JWT token
echo -e "${YELLOW}[1] Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "$CONTENT_TYPE" \
  -d '{
    "email": "test.payroll@vtria.com",
    "password": "TestPayroll@2025"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Authentication failed. Cannot proceed with tests.${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Set Authorization header
AUTH_HEADER="Authorization: Bearer $TOKEN"

# ============================================================================
# TEST SUITE 1: SALARY COMPONENTS
# ============================================================================
echo -e "${YELLOW}[2] Testing Salary Components Endpoints${NC}"
echo "----------------------------------------"

# Test 2.1: Get all salary components
echo "Test 2.1: GET /v1/hr/payroll/components"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/v1/v1/hr/payroll/components" \
  -H "$AUTH_HEADER")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    COMPONENT_COUNT=$(echo "$BODY" | grep -o '"component_code"' | wc -l | tr -d ' ')
    if [ "$COMPONENT_COUNT" -ge 25 ]; then
        print_result 0 "Get all salary components (Found $COMPONENT_COUNT components)"
    else
        print_result 1 "Get all salary components (Expected 25, found $COMPONENT_COUNT)"
    fi
else
    print_result 1 "Get all salary components (HTTP $HTTP_CODE)"
fi

# Test 2.2: Get earning components only
echo "Test 2.2: GET /v1/hr/payroll/components?type=earning"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/v1/hr/payroll/components?type=earning" \
  -H "$AUTH_HEADER")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Get earning components only"
else
    print_result 1 "Get earning components only (HTTP $HTTP_CODE)"
fi

# Test 2.3: Create new salary component
echo "Test 2.3: POST /v1/hr/payroll/components (Create new component)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/hr/payroll/components" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -d '{
    "component_code": "TEST_BONUS",
    "component_name": "Test Bonus",
    "component_type": "earning",
    "calculation_type": "fixed",
    "is_taxable": true,
    "is_statutory": false,
    "affects_ctc": true,
    "affects_gross": true,
    "display_order": 99,
    "description": "Test bonus component"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
    NEW_COMPONENT_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    print_result 0 "Create new salary component (ID: $NEW_COMPONENT_ID)"
else
    print_result 1 "Create new salary component (HTTP $HTTP_CODE)"
fi

echo ""

# ============================================================================
# TEST SUITE 2: EMPLOYEE SALARY STRUCTURE
# ============================================================================
echo -e "${YELLOW}[3] Testing Employee Salary Structure Endpoints${NC}"
echo "----------------------------------------"

# Test 3.1: Get employee salary structure (should be empty initially)
echo "Test 3.1: GET /v1/hr/payroll/employees/1/salary-structure"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/v1/hr/payroll/employees/1/salary-structure" \
  -H "$AUTH_HEADER")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Get employee salary structure"
else
    print_result 1 "Get employee salary structure (HTTP $HTTP_CODE)"
fi

# Test 3.2: Set employee salary structure
echo "Test 3.2: POST /v1/hr/payroll/employees/1/salary-structure (Set salary)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/hr/payroll/employees/1/salary-structure" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -d '{
    "effective_from": "2025-01-01",
    "components": [
      {"component_id": 1, "amount": 30000, "notes": "Basic salary"},
      {"component_id": 2, "amount": 15000, "notes": "HRA - 50% of basic"},
      {"component_id": 3, "amount": 1600, "notes": "Conveyance allowance"},
      {"component_id": 4, "amount": 1250, "notes": "Medical allowance"},
      {"component_id": 5, "amount": 5000, "notes": "Special allowance"}
    ]
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
    print_result 0 "Set employee salary structure"
else
    print_result 1 "Set employee salary structure (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
fi

# Test 3.3: Verify salary structure was set
echo "Test 3.3: GET /v1/hr/payroll/employees/1/salary-structure (Verify)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/v1/hr/payroll/employees/1/salary-structure" \
  -H "$AUTH_HEADER")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    COMPONENT_COUNT=$(echo "$BODY" | grep -o '"component_id"' | wc -l | tr -d ' ')
    if [ "$COMPONENT_COUNT" -ge 5 ]; then
        print_result 0 "Verify salary structure ($COMPONENT_COUNT components found)"
    else
        print_result 1 "Verify salary structure (Expected 5, found $COMPONENT_COUNT)"
    fi
else
    print_result 1 "Verify salary structure (HTTP $HTTP_CODE)"
fi

echo ""

# ============================================================================
# TEST SUITE 3: PAYROLL CYCLES
# ============================================================================
echo -e "${YELLOW}[4] Testing Payroll Cycle Endpoints${NC}"
echo "----------------------------------------"

# Test 4.1: Get all payroll cycles
echo "Test 4.1: GET /v1/hr/payroll/cycles"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/v1/hr/payroll/cycles" \
  -H "$AUTH_HEADER")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Get all payroll cycles"
else
    print_result 1 "Get all payroll cycles (HTTP $HTTP_CODE)"
fi

# Test 4.2: Create payroll cycle
echo "Test 4.2: POST /v1/hr/payroll/cycles (Create cycle)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/hr/payroll/cycles" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -d '{
    "cycle_name": "Test Payroll October 2025",
    "pay_period_start": "2025-10-01",
    "pay_period_end": "2025-10-31",
    "payment_date": "2025-11-05",
    "remarks": "Test payroll cycle"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
    CYCLE_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    print_result 0 "Create payroll cycle (ID: $CYCLE_ID)"
    echo "  → Cycle ID saved for next tests: $CYCLE_ID"
else
    print_result 1 "Create payroll cycle (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    CYCLE_ID=0
fi

echo ""

# ============================================================================
# TEST SUITE 4: PAYROLL PROCESSING
# ============================================================================
if [ "$CYCLE_ID" != "0" ] && [ -n "$CYCLE_ID" ]; then
    echo -e "${YELLOW}[5] Testing Payroll Processing${NC}"
    echo "----------------------------------------"

    # Test 5.1: Process payroll for the cycle
    echo "Test 5.1: POST /v1/hr/payroll/cycles/$CYCLE_ID/process"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/hr/payroll/cycles/$CYCLE_ID/process" \
      -H "$AUTH_HEADER" \
      -H "$CONTENT_TYPE" \
      -d '{}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        EMPLOYEES_PROCESSED=$(echo "$BODY" | grep -o '"employees_processed":[0-9]*' | cut -d':' -f2)
        print_result 0 "Process payroll (Processed $EMPLOYEES_PROCESSED employees)"
    else
        print_result 1 "Process payroll (HTTP $HTTP_CODE)"
        echo "Response: $BODY"
    fi

    # Test 5.2: Get payroll transactions for the cycle
    echo "Test 5.2: GET /v1/hr/payroll/cycles/$CYCLE_ID/transactions"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/v1/hr/payroll/cycles/$CYCLE_ID/transactions" \
      -H "$AUTH_HEADER")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        TRANSACTION_COUNT=$(echo "$BODY" | grep -o '"employee_id"' | wc -l | tr -d ' ')
        print_result 0 "Get payroll transactions ($TRANSACTION_COUNT transactions)"
        
        # Extract first transaction ID for next test
        TRANSACTION_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
        echo "  → Transaction ID for payslip test: $TRANSACTION_ID"
    else
        print_result 1 "Get payroll transactions (HTTP $HTTP_CODE)"
    fi

    # Test 5.3: Get single payroll transaction (payslip)
    if [ -n "$TRANSACTION_ID" ] && [ "$TRANSACTION_ID" != "0" ]; then
        echo "Test 5.3: GET /v1/hr/payroll/transactions/$TRANSACTION_ID (Payslip)"
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/v1/hr/payroll/transactions/$TRANSACTION_ID" \
          -H "$AUTH_HEADER")
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | head -n-1)

        if [ "$HTTP_CODE" = "200" ]; then
            print_result 0 "Get payslip details"
        else
            print_result 1 "Get payslip details (HTTP $HTTP_CODE)"
        fi
    fi

    # Test 5.4: Approve payroll cycle
    echo "Test 5.4: POST /v1/hr/payroll/cycles/$CYCLE_ID/approve"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/hr/payroll/cycles/$CYCLE_ID/approve" \
      -H "$AUTH_HEADER")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ]; then
        print_result 0 "Approve payroll cycle"
    else
        print_result 1 "Approve payroll cycle (HTTP $HTTP_CODE)"
    fi

    echo ""
else
    echo -e "${RED}⚠ Skipping payroll processing tests (no cycle ID)${NC}"
    echo ""
fi

# ============================================================================
# TEST SUITE 5: PAYROLL REPORTS
# ============================================================================
echo -e "${YELLOW}[6] Testing Payroll Reports${NC}"
echo "----------------------------------------"

# Test 6.1: Get payroll summary report
echo "Test 6.1: GET /v1/hr/payroll/reports/summary"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/v1/hr/payroll/reports/summary?year=2025" \
  -H "$AUTH_HEADER")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Get payroll summary report"
else
    print_result 1 "Get payroll summary report (HTTP $HTTP_CODE)"
fi

# Test 6.2: Get employee salary register
echo "Test 6.2: GET /v1/hr/payroll/employees/1/salary-register"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/v1/hr/payroll/employees/1/salary-register" \
  -H "$AUTH_HEADER")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Get employee salary register"
else
    print_result 1 "Get employee salary register (HTTP $HTTP_CODE)"
fi

echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
