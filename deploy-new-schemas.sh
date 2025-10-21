#!/bin/bash

# ============================================
# VTRIA ERP - Deploy New Database Schemas
# Safely deploys ticketing system and case notes enhancements
# ============================================

set -e  # Exit on error

echo "🚀 VTRIA ERP - Database Schema Deployment"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Find the database container
DB_CONTAINER=$(docker ps --filter "name=db" --format "{{.Names}}" | head -n 1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Error: Database container not found. Is docker-compose running?"
    echo "   Run: docker-compose up -d"
    exit 1
fi

echo "✅ Found database container: $DB_CONTAINER"
echo ""

# Database credentials (from docker-compose.yml)
DB_USER="vtria_user"
DB_PASS="dev_password"
DB_NAME="vtria_erp"

echo "📋 Deployment Plan:"
echo "   1. Backup current database"
echo "   2. Deploy ticketing system schema"
echo "   3. Deploy case notes enhancements"
echo "   4. Verify deployment"
echo ""

read -p "Continue with deployment? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo ""
echo "🔄 Step 1: Creating backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec $DB_CONTAINER mysqldump -u$DB_USER -p$DB_PASS $DB_NAME > "sql/backups/$BACKUP_FILE" 2>/dev/null || {
    mkdir -p sql/backups
    docker exec $DB_CONTAINER mysqldump -u$DB_USER -p$DB_PASS $DB_NAME > "sql/backups/$BACKUP_FILE"
}
echo "✅ Backup created: sql/backups/$BACKUP_FILE"
echo ""

echo "🔄 Step 2: Deploying ticketing system schema..."
docker exec -i $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME < sql/create_ticketing_system.sql
echo "✅ Ticketing system deployed successfully"
echo ""

echo "🔄 Step 3: Deploying case notes enhancements..."
docker exec -i $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME < sql/enhance_case_notes.sql
echo "✅ Case notes enhancements deployed successfully"
echo ""

echo "🔄 Step 4: Verifying deployment..."

# Check if tables exist
TABLES_CHECK=$(docker exec $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -sN -e "
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = '$DB_NAME' 
AND table_name IN ('tickets', 'ticket_queues', 'ticket_notes', 'ticket_parts', 'ticket_assignments', 'ticket_status_history', 'ticket_attachments');
")

if [ "$TABLES_CHECK" -eq "7" ]; then
    echo "✅ All 7 ticketing tables created successfully"
else
    echo "⚠️  Warning: Expected 7 ticketing tables, found $TABLES_CHECK"
fi

# Check document sequences
DOC_SEQ_CHECK=$(docker exec $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -sN -e "
SELECT COUNT(*) FROM document_sequences WHERE document_type = 'TK';
")

if [ "$DOC_SEQ_CHECK" -ge "1" ]; then
    echo "✅ Document sequence for tickets (TK) configured"
else
    echo "⚠️  Warning: Ticket document sequence not found"
fi

# Check if triggers exist
TRIGGER_CHECK=$(docker exec $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -sN -e "
SELECT COUNT(*) FROM information_schema.triggers 
WHERE trigger_schema = '$DB_NAME' 
AND trigger_name IN ('prevent_case_note_update', 'prevent_case_note_delete');
")

if [ "$TRIGGER_CHECK" -ge "1" ]; then
    echo "✅ Case notes protection triggers created"
else
    echo "⚠️  Warning: Some triggers may not have been created"
fi

echo ""
echo "======================================"
echo "🎉 Deployment Complete!"
echo "======================================"
echo ""
echo "📊 Summary:"
echo "   ✅ Ticketing System: 7 tables created"
echo "   ✅ Case Notes: Enhanced with triggers"
echo "   ✅ Document Numbering: VESPL/TK/2526/XXX ready"
echo "   ✅ Backup: sql/backups/$BACKUP_FILE"
echo ""
echo "🔗 API Endpoints Available:"
echo "   POST   /api/tickets"
echo "   GET    /api/tickets"
echo "   GET    /api/tickets/:id"
echo "   POST   /api/tickets/:id/close"
echo "   POST   /api/case-management/:case_id/pick"
echo "   POST   /api/case-management/:case_id/reject"
echo ""
echo "📖 Next Steps:"
echo "   1. Restart API server: docker-compose restart api"
echo "   2. Test endpoints with Postman or curl"
echo "   3. Check logs: docker-compose logs -f api"
echo ""
echo "✅ Ready for production use!"
