#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
    echo -e "${RED}Please provide the backup file path${NC}"
    echo "Usage: ./restore.sh <backup_file.tar.gz>"
    exit 1
fi

BACKUP_FILE=$1
TEMP_DIR="temp_restore"

echo -e "${YELLOW}Starting restore process...${NC}"

# Extract backup
echo "Extracting backup..."
mkdir -p "$TEMP_DIR"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_DIR=$(ls "$TEMP_DIR")

# Stop running services
echo "Stopping services..."
docker-compose down

# Restore database
echo "Restoring database..."
docker-compose up -d db
sleep 10 # Wait for database to be ready
cat "$TEMP_DIR/$BACKUP_DIR/database.sql" | docker-compose exec -T db mysql -u root -p"$MYSQL_ROOT_PASSWORD" vtria_erp

# Restore uploads
echo "Restoring uploads..."
rm -rf uploads/
tar -xzf "$TEMP_DIR/$BACKUP_DIR/uploads.tar.gz"

# Restore environment file
echo "Restoring configuration..."
cp "$TEMP_DIR/$BACKUP_DIR/.env.backup" .env

# Cleanup
rm -rf "$TEMP_DIR"

# Start services
echo "Starting services..."
docker-compose up -d

echo -e "${GREEN}Restore completed successfully!${NC}"
echo -e "Please check the system at: ${GREEN}http://localhost:3000${NC}"
