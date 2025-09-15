#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create backup directory
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Starting backup process...${NC}"

# Backup MySQL database
echo "Backing up database..."
docker-compose exec db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" vtria_erp > "$BACKUP_DIR/database.sql"

# Backup uploads directory
echo "Backing up uploads..."
tar -czf "$BACKUP_DIR/uploads.tar.gz" uploads/

# Backup environment files
echo "Backing up configuration..."
cp .env "$BACKUP_DIR/.env.backup"

# Create backup info file
echo "Creating backup info..."
cat << EOF > "$BACKUP_DIR/backup_info.txt"
Backup Date: $(date)
System Version: $(grep "version" api/package.json | cut -d'"' -f4)
Docker Compose Version: $(docker-compose version --short)
EOF

# Create compressed archive
echo "Creating compressed archive..."
tar -czf "vtria_erp_backup_$(date +%Y%m%d_%H%M%S).tar.gz" "$BACKUP_DIR"

# Cleanup
rm -rf "$BACKUP_DIR"

echo -e "${GREEN}Backup completed successfully!${NC}"
echo "Backup file: vtria_erp_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
