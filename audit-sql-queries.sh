#!/bin/bash
# Comprehensive SQL Query Audit Script

echo "=== COMPREHENSIVE SQL AUDIT ==="
echo ""

echo "1. Checking for INSERT with column count mismatches..."
grep -rn "INSERT INTO" api/src/controllers/*.js | grep -E "VALUES.*\(" | head -20

echo ""
echo "2. Checking for common problematic columns..."
echo "   - updated_by in INSERT:"
grep -rn "INSERT INTO.*updated_by" api/src/controllers/*.js || echo "   ✓ None found"

echo ""
echo "3. Checking for deleted_at in INSERT (should use NULL or CURRENT_TIMESTAMP):"
grep -rn "INSERT INTO.*deleted_at" api/src/controllers/*.js | head -10 || echo "   ✓ None found"

echo ""
echo "4. Checking UPDATE statements with potentially missing columns:"
grep -rn "UPDATE.*SET.*updated_by" api/src/controllers/*.js | wc -l | xargs echo "   - updated_by references:"

echo ""
echo "5. Looking for direct column references that might not exist..."
grep -rn "\.updated_by" api/src/controllers/*.js | wc -l | xargs echo "   - Direct updated_by accesses:"

echo ""
echo "6. Checking for common foreign key issues:"
grep -rn "FOREIGN KEY" sql/schema/00-complete_schema.sql | grep -v "^--" | wc -l | xargs echo "   - Total foreign keys defined:"

