#!/bin/bash

# Quick Payroll Test - Manual verification
BASE_URL="http://localhost:3001/api"

echo "========================================"
echo "QUICK PAYROLL API TEST"
echo "========================================"
echo ""

# Login
echo "1. Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test.payroll@vtria.com", "password": "TestPayroll@2025"}' | jq -r '.data.token')

if [ -z "$TOKEN" ]; then
    echo "✗ Login failed"
    exit 1
fi
echo "✓ Logged in successfully"
echo ""

# Test 1: Get salary components
echo "2. GET Salary Components..."
RESPONSE=$(curl -s -X GET "$BASE_URL/v1/hr/payroll/components" -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$RESPONSE" | jq '.data | length')
echo "   Found $COUNT components"
echo ""

# Test 2: Get employee salary structure
echo "3. GET Employee Salary Structure (Employee ID: 1)..."
RESPONSE=$(curl -s -X GET "$BASE_URL/v1/hr/payroll/employees/1/salary-structure" \
  -H "Authorization: Bearer $TOKEN")
echo "$RESPONSE" | jq '{
  employee_id: .data.employee_id,
  component_count: (.data.components | length),
  totals: .data.totals
}'
echo ""

# Test 3: Create payroll cycle
echo "4. POST Create Payroll Cycle..."
RESPONSE=$(curl -s -X POST "$BASE_URL/v1/hr/payroll/cycles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cycle_name": "Manual Test October 2025",
    "pay_period_start": "2025-10-01",
    "pay_period_end": "2025-10-31",
    "payment_date": "2025-11-05",
    "remarks": "Manual test cycle"
  }')
CYCLE_ID=$(echo "$RESPONSE" | jq -r '.data.id')
echo "   Cycle ID: $CYCLE_ID"
echo ""

if [ "$CYCLE_ID" != "null" ] && [ -n "$CYCLE_ID" ]; then
    # Test 4: Process payroll
    echo "5. POST Process Payroll (Cycle ID: $CYCLE_ID)..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/v1/hr/payroll/cycles/$CYCLE_ID/process" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"employee_ids": [1]}')
    echo "$RESPONSE" | jq '{
      success: .success,
      employees_processed: .data.employees_processed,
      total_gross: .data.total_gross,
      total_net: .data.total_net
    }'
    echo ""
    
    # Test 5: Get transactions
    echo "6. GET Payroll Transactions (Cycle ID: $CYCLE_ID)..."
    RESPONSE=$(curl -s -X GET "$BASE_URL/v1/hr/payroll/cycles/$CYCLE_ID/transactions" \
      -H "Authorization: Bearer $TOKEN")
    echo "$RESPONSE" | jq '.data[] | {
      employee_name: .employee_name,
      gross_salary: .gross_salary,
      total_deductions: .total_deductions,
      net_salary: .net_salary,
      status: .status
    }'
    echo ""
    
    # Test 6: Get single payslip
    TRANSACTION_ID=$(echo "$RESPONSE" | jq -r '.data[0].id')
    if [ "$TRANSACTION_ID" != "null" ] && [ -n "$TRANSACTION_ID" ]; then
        echo "7. GET Payslip Details (Transaction ID: $TRANSACTION_ID)..."
        curl -s -X GET "$BASE_URL/v1/hr/payroll/transactions/$TRANSACTION_ID" \
          -H "Authorization: Bearer $TOKEN" | jq '{
          employee: .data.employee_name,
          department: .data.department,
          pay_period: {
            start: .data.pay_period_start,
            end: .data.pay_period_end
          },
          attendance: {
            total_days: .data.total_days,
            present_days: .data.present_days
          },
          earnings: {
            basic: .data.basic_salary,
            hra: .data.hra,
            gross: .data.gross_salary
          },
          deductions: {
            pf: .data.pf_employee,
            pt: .data.professional_tax,
            total: .data.total_deductions
          },
          net_salary: .data.net_salary,
          status: .data.status
        }'
        echo ""
    fi
    
    # Test 7: Approve payroll
    echo "8. POST Approve Payroll (Cycle ID: $CYCLE_ID)..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/v1/hr/payroll/cycles/$CYCLE_ID/approve" \
      -H "Authorization: Bearer $TOKEN")
    echo "$RESPONSE" | jq '{success: .success, message: .message}'
    echo ""
fi

# Test 8: Get payroll summary
echo "9. GET Payroll Summary Report..."
curl -s -X GET "$BASE_URL/v1/hr/payroll/reports/summary?year=2025" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {
  cycle_name: .cycle_name,
  payment_date: .payment_date,
  employees: .total_employees,
  total_gross: .total_gross,
  total_net: .total_net,
  status: .status
}' | head -20
echo ""

echo "========================================"
echo "✓ All manual tests completed!"
echo "========================================"
