#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting VTRIA ERP System...${NC}"

# Check if MySQL is running
echo "Checking MySQL connection..."
mysql --host=localhost --user=root -e "SELECT 1" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}MySQL is running${NC}"
else
    echo "Error: MySQL is not running. Please start MySQL first."
    exit 1
fi

# Start the backend server
echo -e "${YELLOW}Starting backend server...${NC}"
cd api
npm start
