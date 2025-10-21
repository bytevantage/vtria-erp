#!/bin/bash

# ============================================
# VTRIA ERP - Verify Database Deployment
# Checks if all new features are properly deployed
# ============================================

set -e

echo "🔍 VTRIA ERP - Database Verification"
echo "====================================="
echo ""

# Find database container
DB_CONTAINER=$(docker ps --filter "name=db" --format "{{.Names}}" | head -n 1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Database container not found"
    exit 1
fi

DB_USER="vtria_user"
DB_PASS="dev_password"
DB_NAME="vtria_erp"

echo "📊 Checking Database Tables..."
echo ""

# Check ticketing tables
echo "1. Ticketing System Tables:"
docker exec $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024), 2) AS 'Size (KB)'
FROM information_schema.tables
WHERE table_schema = '$DB_NAME'
AND table_name IN ('tickets', 'ticket_queues', 'ticket_notes', 'ticket_parts', 'ticket_assignments', 'ticket_status_history', 'ticket_attachments')
ORDER BY table_name;
"

# Check case tables
echo ""
echo "2. Case Management Tables:"
docker exec $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024), 2) AS 'Size (KB)'
FROM information_schema.tables
WHERE table_schema = '$DB_NAME'
AND table_name IN ('cases', 'case_notes', 'case_assignments', 'case_state_transitions')
ORDER BY table_name;
"

# Check document sequences
echo ""
echo "3. Document Sequences:"
docker exec $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "
SELECT document_type, financial_year, last_sequence, updated_at
FROM document_sequences
ORDER BY document_type;
"

# Check triggers
echo ""
echo "4. Database Triggers:"
docker exec $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = '$DB_NAME'
AND trigger_name IN ('prevent_case_note_update', 'prevent_case_note_delete')
ORDER BY trigger_name;
"

# Check stored procedures
echo ""
echo "5. Stored Procedures:"
docker exec $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = '$DB_NAME'
AND routine_name = 'add_case_note';
"

# Check ticket queues data
echo ""
echo "6. Default Ticket Queues:"
docker exec $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "
SELECT id, name, queue_type, sla_hours, is_active
FROM ticket_queues
ORDER BY id;
"

# Overall statistics
echo ""
echo "7. Overall Database Statistics:"
docker exec $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "
SELECT 
    COUNT(*) as total_tables,
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Total Size (MB)'
FROM information_schema.tables
WHERE table_schema = '$DB_NAME';
"

echo ""
echo "======================================"
echo "✅ Verification Complete!"
echo "======================================"
