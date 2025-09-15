#!/bin/bash

# VTRIA ERP Database Backup Script
# This script creates a complete backup of the VTRIA ERP database

# Configuration
DB_CONTAINER="vtria-erp-db-1"
DB_NAME="vtria_erp"
DB_USER="vtria_user"
DB_PASS="dev_password"
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="vtria_erp_backup_${DATE}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🗄️  Starting VTRIA ERP database backup..."
echo "📅 Backup Date: $(date)"
echo "🗂️  Backup File: $BACKUP_DIR/$BACKUP_FILE"

# Create the backup
docker exec "$DB_CONTAINER" mysqldump -u "$DB_USER" -p"$DB_PASS" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    --complete-insert \
    --add-drop-table \
    --create-options \
    --disable-keys \
    --extended-insert \
    --lock-tables=false \
    "$DB_NAME" > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    # Compress the backup
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    
    # Get file size
    BACKUP_SIZE=$(ls -lh "$BACKUP_DIR/$BACKUP_FILE.gz" | awk '{print $5}')
    
    echo "✅ Backup completed successfully!"
    echo "📦 Compressed Size: $BACKUP_SIZE"
    echo "📁 Location: $BACKUP_DIR/$BACKUP_FILE.gz"
    
    # Clean up old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "vtria_erp_backup_*.sql.gz" -type f -mtime +7 -delete
    echo "🧹 Old backups cleaned (kept last 7 days)"
    
    # Show database statistics
    echo ""
    echo "📊 Database Statistics:"
    docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT COUNT(*) as 'Total Tables' FROM information_schema.TABLES WHERE table_schema='$DB_NAME';
        SELECT 
            SUM(TABLE_ROWS) as 'Total Rows',
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Total Size (MB)'
        FROM information_schema.TABLES 
        WHERE table_schema='$DB_NAME';
    " 2>/dev/null
    
else
    echo "❌ Backup failed!"
    exit 1
fi

echo ""
echo "🔧 To restore this backup, run:"
echo "   ./restore-database.sh $BACKUP_FILE.gz"