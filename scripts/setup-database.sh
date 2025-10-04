#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Setting up VTRIA ERP Database...${NC}"

# Check if MySQL is running
if ! pgrep -x "mysqld" > /dev/null; then
    echo -e "${YELLOW}⚠️  MySQL server is not running. Starting MySQL...${NC}"
    sudo service mysql start
fi

# Prompt for MySQL root password
echo -e "${YELLOW}Enter MySQL root password (press Enter if no password):${NC}"
read -s MYSQL_ROOT_PASSWORD

# Set MySQL command with or without password
MYSQL_CMD="mysql"
if [ -n "$MYSQL_ROOT_PASSWORD" ]; then
    MYSQL_CMD="mysql -p$MYSQL_ROOT_PASSWORD"
fi

# Create database and user
echo -e "${YELLOW}Creating database and user...${NC}"

$MYSQL_CMD -e "
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS vtria_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user if not exists
CREATE USER IF NOT EXISTS 'vtria_user'@'localhost' IDENTIFIED BY 'dev_password';
GRANT ALL PRIVILEGES ON vtria_erp.* TO 'vtria_user'@'localhost';
FLUSH PRIVILEGES;
"

if [ $? -ne 0 ]; then
    echo -e "❌ Error creating database and user. Please check your MySQL root password and try again."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created. Please review and update the configuration as needed.${NC}"
else
    echo -e "${YELLOW}ℹ️  .env file already exists. Skipping creation.${NC}"
fi

echo -e "${GREEN}✅ Database setup completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the .env file and update the configuration as needed"
echo "2. Run database migrations: node scripts/run-migration.js"
echo "3. Start the application: npm start"

exit 0
