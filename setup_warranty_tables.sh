#!/bin/bash

# VTRIA ERP - Serial Warranty Tables Setup Script
# This script applies the warranty_claims and serial_number_history tables

echo "═══════════════════════════════════════════════════════════════"
echo "   VTRIA ERP - Serial Warranty Tables Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Database connection details
DB_HOST="localhost"
DB_USER="root"
DB_PASS=""
DB_NAME="vtria_erp_dev"

echo "🔍 Checking MySQL connection..."
if ! mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" -e "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Cannot connect to MySQL. Please check your credentials and ensure MySQL is running."
    echo "   Host: $DB_HOST"
    echo "   User: $DB_USER"
    echo "   Database: $DB_NAME"
    exit 1
fi

echo "✅ MySQL connection successful"
echo ""

echo "🔍 Checking if database '$DB_NAME' exists..."
if ! mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME; SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Database '$DB_NAME' does not exist."
    echo "   Please create the database first or update the script with correct database name."
    exit 1
fi

echo "✅ Database '$DB_NAME' exists"
echo ""

echo "📋 Applying warranty tables..."
echo "───────────────────────────────────────────────────────────────"

# Apply the SQL file
SQL_FILE="/Users/srbhandary/Documents/Projects/vtria-erp/database/schema/serial_warranty_tracking.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL file not found: $SQL_FILE"
    exit 1
fi

echo "📄 Executing: $SQL_FILE"

# Execute the SQL file
mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Warranty tables applied successfully!"
    echo ""
    echo "📊 Tables created:"
    echo "   - warranty_claims"
    echo "   - serial_number_history"
    echo ""
    echo "🔧 Additional columns added to product_serial_numbers:"
    echo "   - batch_number"
    echo "   - manufacturing_date"
    echo "   - warranty_months"
    echo "   - sales_order_id"
    echo "   - created_by"
    echo "   - updated_by"
    echo ""
    echo "🎉 Serial number and warranty tracking is now fully functional!"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Restart your application server"
    echo "   2. Test serial number generation"
    echo "   3. Test warranty claims creation"
    echo "   4. Test warranty expiry reports"
else
    echo "❌ Failed to apply warranty tables. Please check the error messages above."
    exit 1
fi

echo "═══════════════════════════════════════════════════════════════"