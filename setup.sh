#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up VTRIA ERP System...${NC}"

# Create necessary directories
echo "Creating directories..."
mkdir -p uploads/documents/{purchase_orders,proforma_invoices,quotations,invoices}
mkdir -p logs

# Check if .env exists, if not create from development template
if [ ! -f api/.env ]; then
    echo "Creating .env file..."
    cp api/.env.development api/.env
fi

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd api
npm install

# Check if MySQL is running
echo -e "${YELLOW}Checking MySQL connection...${NC}"
mysql --host=localhost --user=root -e "SELECT 1" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}MySQL is running${NC}"
else
    echo "Error: MySQL is not running. Please start MySQL first."
    exit 1
fi

# Create database and import schema
echo -e "${YELLOW}Setting up database...${NC}"
mysql --host=localhost --user=root -e "CREATE DATABASE IF NOT EXISTS vtria_erp"
for f in ../sql/schema/*.sql; do
    echo "Importing $f..."
    mysql --host=localhost --user=root vtria_erp < "$f"
done

echo -e "${GREEN}Setup completed!${NC}"
echo -e "You can now start the server with: ${YELLOW}npm start${NC}"
