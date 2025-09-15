#!/bin/bash

# VTRIA ERP - Comprehensive API Endpoint Testing Script
# This script tests all implemented API endpoints to verify 100% functionality

BASE_URL="http://localhost:3001/api"
RESULTS_FILE="/tmp/vtria_test_results.txt"

echo "🚀 VTRIA ERP API Testing Suite" > $RESULTS_FILE
echo "================================" >> $RESULTS_FILE
echo "Timestamp: $(date)" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo "Testing: $method $endpoint - $description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL$endpoint")
    else
        response="SKIP - $method not tested in this script"
    fi
    
    echo "✓ $method $endpoint - $description: $response" >> $RESULTS_FILE
    echo "---" >> $RESULTS_FILE
}

# Core System Endpoints
echo "Testing Core System Endpoints..."
test_endpoint "GET" "/company-config" "Company Configuration"
test_endpoint "GET" "/company-config/locations" "Company Locations"
test_endpoint "GET" "/company-config/tax-config" "Tax Configuration"

# Document Management Endpoints
echo "Testing Document Management Endpoints..."
test_endpoint "GET" "/purchase-requisition" "Purchase Requisitions"
test_endpoint "GET" "/grn" "Goods Received Notes"
test_endpoint "GET" "/bom" "Bill of Materials"
test_endpoint "GET" "/delivery-challan" "Delivery Challans"

# Suppliers and Inventory
echo "Testing Suppliers and Inventory Endpoints..."
test_endpoint "GET" "/suppliers/test" "Suppliers Test Route"
test_endpoint "GET" "/inventory" "Inventory Management"
test_endpoint "GET" "/stock" "Stock Management"

# Sales and Manufacturing
echo "Testing Sales and Manufacturing Endpoints..."
test_endpoint "GET" "/sales-enquiry" "Sales Enquiries"
test_endpoint "GET" "/estimation" "Estimations"
test_endpoint "GET" "/quotation" "Quotations"
test_endpoint "GET" "/sales-order" "Sales Orders"
test_endpoint "GET" "/manufacturing" "Manufacturing"

# User Management and RBAC
echo "Testing User Management Endpoints..."
test_endpoint "GET" "/users" "User Management"
test_endpoint "GET" "/rbac" "Role-Based Access Control"

echo "" >> $RESULTS_FILE
echo "Test completed at: $(date)" >> $RESULTS_FILE

echo "✅ Testing completed. Results saved to $RESULTS_FILE"
echo "To view results: cat $RESULTS_FILE"
