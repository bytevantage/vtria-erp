#!/bin/bash

# VTRIA ERP - Expenses API Test Script
# This script tests all expenses management endpoints

BASE_URL="http://localhost:3001/api"
TOKEN=""

echo "========================================="
echo "VTRIA ERP - Expenses API Test"
echo "========================================="
echo ""

# Step 1: Login to get token
echo "1. Logging in to get authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vtria.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Login failed!"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Login successful!"
echo ""

# Step 2: Get expense categories
echo "2. Fetching expense categories..."
CATEGORIES_RESPONSE=$(curl -s -X GET "$BASE_URL/financial/expense-categories" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $CATEGORIES_RESPONSE | jq '.'
echo ""

# Step 3: Get all expenses
echo "3. Fetching all expenses (with pagination)..."
EXPENSES_RESPONSE=$(curl -s -X GET "$BASE_URL/financial/expenses?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $EXPENSES_RESPONSE | jq '.'
echo ""

# Step 4: Create a new expense
echo "4. Creating a new expense..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/financial/expenses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expense_date": "2025-01-12",
    "category_id": 1,
    "department_id": 1,
    "employee_id": 1,
    "amount": 5000,
    "tax_amount": 900,
    "payment_method": "bank_transfer",
    "description": "Office supplies and equipment",
    "receipt_number": "RCP-2025-001",
    "items": [
      {
        "item_description": "Printer",
        "quantity": 1,
        "unit_price": 3000,
        "tax_rate": 18,
        "tax_amount": 540,
        "total_amount": 3540
      },
      {
        "item_description": "Stationery",
        "quantity": 1,
        "unit_price": 2000,
        "tax_rate": 18,
        "tax_amount": 360,
        "total_amount": 2360
      }
    ]
  }')

echo "Response:"
echo $CREATE_RESPONSE | jq '.'
EXPENSE_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')
echo ""

# Step 5: Get expense by ID (if created successfully)
if [ "$EXPENSE_ID" != "null" ] && [ -n "$EXPENSE_ID" ]; then
    echo "5. Fetching expense by ID ($EXPENSE_ID)..."
    EXPENSE_DETAIL=$(curl -s -X GET "$BASE_URL/financial/expenses/$EXPENSE_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "Response:"
    echo $EXPENSE_DETAIL | jq '.'
    echo ""

    # Step 6: Update the expense
    echo "6. Updating expense..."
    UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/financial/expenses/$EXPENSE_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "expense_date": "2025-01-12",
        "category_id": 1,
        "amount": 5500,
        "tax_amount": 990,
        "payment_method": "bank_transfer",
        "description": "Office supplies and equipment (Updated)"
      }')
    
    echo "Response:"
    echo $UPDATE_RESPONSE | jq '.'
    echo ""

    # Step 7: Get expense summary
    echo "7. Getting expense summary..."
    SUMMARY_RESPONSE=$(curl -s -X GET "$BASE_URL/financial/expenses/summary?groupBy=category" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "Response:"
    echo $SUMMARY_RESPONSE | jq '.'
    echo ""
else
    echo "⚠️  Skipping steps 5-7 as expense creation failed"
    echo ""
fi

# Step 8: Test filtering
echo "8. Testing expense filters (by category)..."
FILTER_RESPONSE=$(curl -s -X GET "$BASE_URL/financial/expenses?category_id=1&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $FILTER_RESPONSE | jq '.'
echo ""

echo "========================================="
echo "Test Completed!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Expense categories: $(echo $CATEGORIES_RESPONSE | jq '.data | length') categories"
echo "- Total expenses: $(echo $EXPENSES_RESPONSE | jq '.pagination.total')"
if [ "$EXPENSE_ID" != "null" ] && [ -n "$EXPENSE_ID" ]; then
    echo "- New expense created: ID $EXPENSE_ID"
fi
echo ""
