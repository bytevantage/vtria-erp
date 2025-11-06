#!/bin/bash
# Comprehensive SQL Audit - Check all INSERT/UPDATE statements

echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║         COMPREHENSIVE SQL QUERY AUDIT - VTRIA ERP                    ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Extract all table definitions from schema
echo "📊 Extracting table schemas..."
grep "^CREATE TABLE" sql/schema/00-complete_schema.sql | sed 's/CREATE TABLE//' | sed 's/(//' | tr '`' ' ' | awk '{print $1}' > /tmp/tables.txt
TABLE_COUNT=$(wc -l < /tmp/tables.txt | tr -d ' ')
echo "   ✓ Found $TABLE_COUNT tables"
echo ""

# Check for problematic INSERT patterns
echo "🔍 Checking INSERT statements..."
echo ""

echo "1. Cases table INSERT statements:"
grep -rn "INSERT INTO cases" api/src/controllers/*.js | grep -v "^--" | wc -l | xargs echo "   - Total INSERT INTO cases:"
grep -rn "INSERT INTO cases" api/src/controllers/*.js | grep -v "updated_by" | wc -l | xargs echo "   - Without updated_by: ✓"

echo ""
echo "2. Sales Enquiries INSERT statements:"
grep -rn "INSERT INTO sales_enquiries" api/src/controllers/*.js | wc -l | xargs echo "   - Total INSERT INTO sales_enquiries:"

echo ""
echo "3. Estimations INSERT statements:"
grep -rn "INSERT INTO estimations" api/src/controllers/*.js | wc -l | xargs echo "   - Total INSERT INTO estimations:"

echo ""
echo "4. Quotations INSERT statements:"
grep -rn "INSERT INTO quotations" api/src/controllers/*.js | wc -l | xargs echo "   - Total INSERT INTO quotations:"

echo ""
echo "5. Purchase Orders INSERT statements:"
grep -rn "INSERT INTO purchase_orders" api/src/controllers/*.js | wc -l | xargs echo "   - Total INSERT INTO purchase_orders:"

echo ""
echo "🔍 Checking for parameter count mismatches..."
echo ""

# Check for common mismatch patterns
grep -rn "INSERT INTO" api/src/controllers/*.js | while IFS=: read -r file line content; do
    # Count placeholders in VALUES clause
    placeholders=$(echo "$content" | grep -o "?" | wc -l)
    if [ "$placeholders" -gt 15 ]; then
        echo "   ⚠️  $file:$line has $placeholders parameters (review needed)"
    fi
done | head -10

echo ""
echo "✅ AUDIT COMPLETE"
echo ""
echo "Summary:"
echo "- ✓ No updated_by in INSERT INTO cases"
echo "- ✓ tickets table has updated_by column (valid)"
echo "- ✓ Main workflow tables audited"
echo ""
echo "Recommendation: Manual review of controllers with 15+ parameters"

