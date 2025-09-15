#!/bin/bash

# VTRIA ERP Database Restore Script
# This script restores a database backup

# Configuration
DB_CONTAINER="vtria-erp-db-1"
DB_NAME="vtria_erp"
DB_USER="vtria_user"
DB_PASS="dev_password"
BACKUP_DIR="./backups"

# Check if backup file parameter is provided
if [ $# -eq 0 ]; then
    echo "❌ Error: Please provide backup file name"
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/vtria_erp_backup_*.sql.gz 2>/dev/null | tail -10
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# Check if backup file exists
if [ ! -f "$BACKUP_PATH" ]; then
    echo "❌ Backup file not found: $BACKUP_PATH"
    exit 1
fi

echo "🔄 Starting VTRIA ERP database restore..."
echo "📅 Restore Date: $(date)"
echo "🗂️  Backup File: $BACKUP_PATH"

# Confirm restore operation
read -p "⚠️  This will completely replace the current database. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🚫 Restore cancelled."
    exit 1
fi

# Create a safety backup of current database
SAFETY_BACKUP="vtria_erp_safety_backup_$(date +"%Y%m%d_%H%M%S").sql"
echo "💾 Creating safety backup: $SAFETY_BACKUP"
docker exec "$DB_CONTAINER" mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_DIR/$SAFETY_BACKUP"

# Drop and recreate database
echo "🗑️  Dropping current database..."
docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Restore from backup
echo "📥 Restoring database from backup..."
if [[ $BACKUP_FILE == *.gz ]]; then
    # Compressed backup
    gunzip -c "$BACKUP_PATH" | docker exec -i "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"
else
    # Uncompressed backup
    docker exec -i "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$BACKUP_PATH"
fi

# Check if restore was successful
if [ $? -eq 0 ]; then
    echo "✅ Database restore completed successfully!"
    
    # Show database statistics
    echo ""
    echo "📊 Restored Database Statistics:"
    docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT COUNT(*) as 'Total Tables' FROM information_schema.TABLES WHERE table_schema='$DB_NAME';
        SELECT 
            SUM(TABLE_ROWS) as 'Total Rows',
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Total Size (MB)'
        FROM information_schema.TABLES 
        WHERE table_schema='$DB_NAME';
    " 2>/dev/null
    
    echo ""
    echo "💾 Safety backup saved as: $BACKUP_DIR/$SAFETY_BACKUP"
    
else
    echo "❌ Restore failed!"
    echo "🔄 Restoring from safety backup..."
    docker exec -i "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$BACKUP_DIR/$SAFETY_BACKUP"
    exit 1
fi