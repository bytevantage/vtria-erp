#!/bin/bash

# VTRIA ERP Backup Script
# This script creates backups of the database and application files

set -e  # Exit on any error

# Configuration
PROJECT_DIR="/opt/vtria-erp"
BACKUP_DIR="/var/backups/vtria-erp"
LOG_FILE="/var/log/vtria-erp-backup.log"
RETENTION_DAYS=30

# Database configuration
DB_USER="${DB_USER:-vtria_user}"
DB_PASS="${DB_PASS:-secure_production_password_2025}"
DB_NAME="${DB_NAME:-vtria_erp_prod}"
DB_HOST="${DB_HOST:-localhost}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log "Starting VTRIA ERP backup process..."

# 1. Database Backup
log "Creating database backup..."
DB_BACKUP_FILE="$BACKUP_DIR/vtria_erp_db_$TIMESTAMP.sql"

if mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" \
    --single-transaction \
    --routines \
    --triggers \
    --add-drop-database \
    --databases "$DB_NAME" > "$DB_BACKUP_FILE"; then
    
    # Compress the SQL file
    gzip "$DB_BACKUP_FILE"
    success "Database backup created: ${DB_BACKUP_FILE}.gz"
else
    error "Database backup failed"
fi

# 2. Application Files Backup
log "Creating application files backup..."
APP_BACKUP_FILE="$BACKUP_DIR/vtria_erp_app_$TIMESTAMP.tar.gz"

if tar -czf "$APP_BACKUP_FILE" \
    -C "$PROJECT_DIR" \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='uploads/temp' \
    --exclude='.git' \
    .; then
    success "Application backup created: $APP_BACKUP_FILE"
else
    error "Application backup failed"
fi

# 3. Configuration Backup
log "Creating configuration backup..."
CONFIG_BACKUP_FILE="$BACKUP_DIR/vtria_erp_config_$TIMESTAMP.tar.gz"

if tar -czf "$CONFIG_BACKUP_FILE" \
    /etc/nginx/sites-available/vtria-erp \
    /etc/systemd/system/vtria-erp.service \
    /etc/cron.d/vtria-erp-backup \
    /etc/logrotate.d/vtria-erp \
    2>/dev/null; then
    success "Configuration backup created: $CONFIG_BACKUP_FILE"
else
    warning "Some configuration files may not exist yet"
fi

# 4. Logs Backup
log "Creating logs backup..."
LOGS_BACKUP_FILE="$BACKUP_DIR/vtria_erp_logs_$TIMESTAMP.tar.gz"

if [ -d "$PROJECT_DIR/api/logs" ]; then
    tar -czf "$LOGS_BACKUP_FILE" -C "$PROJECT_DIR/api" logs/
    success "Logs backup created: $LOGS_BACKUP_FILE"
else
    warning "Logs directory not found"
fi

# 5. Uploads Backup
log "Creating uploads backup..."
UPLOADS_BACKUP_FILE="$BACKUP_DIR/vtria_erp_uploads_$TIMESTAMP.tar.gz"

if [ -d "$PROJECT_DIR/api/uploads" ]; then
    tar -czf "$UPLOADS_BACKUP_FILE" -C "$PROJECT_DIR/api" uploads/
    success "Uploads backup created: $UPLOADS_BACKUP_FILE"
else
    warning "Uploads directory not found"
fi

# 6. Cleanup old backups
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "vtria_erp_*" -type f -mtime +$RETENTION_DAYS -delete
success "Old backups cleaned up"

# 7. Backup verification
log "Verifying backup integrity..."
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/vtria_erp_*_$TIMESTAMP.* 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -ge 2 ]; then
    success "Backup verification passed - $BACKUP_COUNT files created"
else
    warning "Backup verification warning - only $BACKUP_COUNT files created"
fi

# 8. Generate backup report
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Backup completed successfully!"
log "Total backup size: $BACKUP_SIZE"
log "Backup location: $BACKUP_DIR"

# 9. Health check (optional)
if command -v curl &> /dev/null; then
    log "Performing post-backup health check..."
    if curl -f -s http://localhost:3001/health > /dev/null; then
        success "Application health check passed"
    else
        warning "Application health check failed"
    fi
fi

success "✅ VTRIA ERP backup process completed at $(date)"

# Send notification (if email is configured)
if command -v mail &> /dev/null && [ ! -z "$ADMIN_EMAIL" ]; then
    echo "VTRIA ERP backup completed successfully at $(date)" | \
    mail -s "VTRIA ERP Backup Report - $TIMESTAMP" "$ADMIN_EMAIL"
fi