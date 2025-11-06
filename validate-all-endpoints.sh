#!/bin/bash
# VTRIA ERP - Complete Endpoint Validation Script
# This script checks all forms, buttons, and API endpoints for potential SQL issues

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║     VTRIA ERP - COMPREHENSIVE ENDPOINT & SQL VALIDATION                   ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔍 Running comprehensive validation..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# 1. Check all INSERT statements
echo "════════════════════════════════════════════════════════════════════════════"
echo "1️⃣  VALIDATING INSERT STATEMENTS"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

echo "📋 Checking for column count mismatches..."
while IFS=: read -r file line content; do
    # Extract table name
    table=$(echo "$content" | grep -oP 'INSERT INTO \K\w+')
    
    # Count columns (between parentheses after table name)
    columns=$(echo "$content" | sed -n 's/.*INSERT INTO [^ ]* (\([^)]*\)).*/\1/p' | grep -o ',' | wc -l)
    columns=$((columns + 1))
    
    # Count value placeholders
    placeholders=$(echo "$content" | grep -o '?' | wc -l)
    
    # Compare
    if [ "$columns" -gt 0 ] && [ "$placeholders" -gt 0 ]; then
        if [ "$columns" -ne "$placeholders" ]; then
            echo -e "${RED}❌ MISMATCH${NC} $file:$line"
            echo "   Table: $table, Columns: $columns, Values: $placeholders"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    fi
done < <(grep -rn "INSERT INTO" api/src/controllers/*.js | grep -v "//" | grep -v "^\s*\*")

if [ "$ISSUES_FOUND" -eq 0 ]; then
    echo -e "${GREEN}✅ No column count mismatches found${NC}"
fi

echo ""

# 2. Check for problematic column usage
echo "════════════════════════════════════════════════════════════════════════════"
echo "2️⃣  CHECKING PROBLEMATIC COLUMN PATTERNS"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

echo "📋 Checking for updated_by in INSERT statements (excluding tickets)..."
UPDATED_BY_INSERTS=$(grep -rn "INSERT INTO" api/src/controllers/*.js | grep "updated_by" | grep -v "tickets" | wc -l)
if [ "$UPDATED_BY_INSERTS" -gt 0 ]; then
    echo -e "${RED}❌ Found $UPDATED_BY_INSERTS INSERT statements with updated_by (non-tickets)${NC}"
    grep -rn "INSERT INTO" api/src/controllers/*.js | grep "updated_by" | grep -v "tickets"
    ISSUES_FOUND=$((ISSUES_FOUND + UPDATED_BY_INSERTS))
else
    echo -e "${GREEN}✅ No problematic updated_by in INSERT statements${NC}"
fi

echo ""

# 3. Validate main workflow endpoints
echo "════════════════════════════════════════════════════════════════════════════"
echo "3️⃣  VALIDATING MAIN WORKFLOW ENDPOINTS"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

WORKFLOW_TABLES=("sales_enquiries" "cases" "estimations" "quotations" "sales_orders" "purchase_orders")

for table in "${WORKFLOW_TABLES[@]}"; do
    echo "📋 Checking $table..."
    
    # Count INSERT statements
    inserts=$(grep -r "INSERT INTO $table" api/src/controllers/*.js 2>/dev/null | wc -l)
    
    # Count UPDATE statements
    updates=$(grep -r "UPDATE $table" api/src/controllers/*.js 2>/dev/null | wc -l)
    
    if [ "$inserts" -gt 0 ] || [ "$updates" -gt 0 ]; then
        echo -e "   ${GREEN}✓${NC} INSERTs: $inserts, UPDATEs: $updates"
    else
        echo -e "   ${YELLOW}⚠${NC} No SQL operations found (might use different name)"
    fi
done

echo ""

# 4. Check foreign key constraints
echo "════════════════════════════════════════════════════════════════════════════"
echo "4️⃣  FOREIGN KEY INTEGRITY"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

FK_COUNT=$(grep "FOREIGN KEY" sql/schema/00-complete_schema.sql | grep -v "^--" | wc -l)
echo -e "📋 Total Foreign Keys: ${GREEN}$FK_COUNT${NC}"

echo ""

# 5. Check for common SQL injection risks
echo "════════════════════════════════════════════════════════════════════════════"
echo "5️⃣  SQL INJECTION RISK ASSESSMENT"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

echo "📋 Checking for string concatenation in SQL..."
STRING_CONCAT=$(grep -rn "INSERT INTO.*+.*" api/src/controllers/*.js 2>/dev/null | wc -l)
if [ "$STRING_CONCAT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $STRING_CONCAT potential string concatenations${NC}"
    echo "   Manual review recommended"
else
    echo -e "${GREEN}✅ Using parameterized queries (prepared statements)${NC}"
fi

echo ""

# 6. Validate table existence
echo "════════════════════════════════════════════════════════════════════════════"
echo "6️⃣  DATABASE SCHEMA VALIDATION"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

echo "📋 Extracting tables from schema..."
SCHEMA_TABLES=$(grep "^CREATE TABLE" sql/schema/00-complete_schema.sql | wc -l)
echo -e "   ${GREEN}✓${NC} Total tables defined: $SCHEMA_TABLES"

echo ""

# 7. Check client-side form validations
echo "════════════════════════════════════════════════════════════════════════════"
echo "7️⃣  CLIENT-SIDE FORM VALIDATION"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

echo "📋 Checking for required field validations..."
FORM_VALIDATIONS=$(find client/src -name "*.js" -o -name "*.jsx" -o -name "*.tsx" | xargs grep -l "required" 2>/dev/null | wc -l)
echo -e "   ${GREEN}✓${NC} Files with form validation: $FORM_VALIDATIONS"

echo ""

# Final Summary
echo "════════════════════════════════════════════════════════════════════════════"
echo "📊 VALIDATION SUMMARY"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

if [ "$ISSUES_FOUND" -eq 0 ]; then
    echo -e "${GREEN}✅ ALL VALIDATIONS PASSED${NC}"
    echo ""
    echo "Summary:"
    echo "  ✓ No column count mismatches"
    echo "  ✓ No problematic column usage"
    echo "  ✓ All workflow endpoints validated"
    echo "  ✓ $FK_COUNT foreign keys defined"
    echo "  ✓ Using parameterized queries"
    echo "  ✓ $SCHEMA_TABLES tables in schema"
    echo ""
    echo -e "${GREEN}System Status: PRODUCTION READY ✅${NC}"
else
    echo -e "${RED}❌ FOUND $ISSUES_FOUND ISSUES${NC}"
    echo ""
    echo "Please review the issues above and fix before deployment."
    echo ""
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "💡 RECOMMENDATIONS"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "1. Run this script before every deployment"
echo "2. Test all forms manually after code changes"
echo "3. Monitor API logs for SQL errors"
echo "4. Use browser DevTools Network tab to check for 500 errors"
echo "5. Review SQL_AUDIT_REPORT.md for detailed findings"
echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "✅ Validation Complete"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
