#!/bin/bash

# Production Module Testing Startup Script
# This script prepares the environment for testing the Production Module

echo "================================================"
echo "   VTRIA ERP - Production Module Testing"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is available
    fi
}

# Function to check if a docker container is running
check_container() {
    local container_name=$1
    if docker ps | grep -q $container_name; then
        return 0  # Container is running
    else
        return 1  # Container is not running
    fi
}

echo "Step 1: Checking Prerequisites..."
echo "-----------------------------------"

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    echo "  Please start Docker Desktop and try again."
    exit 1
else
    echo -e "${GREEN}✓ Docker is running${NC}"
fi

# Check MySQL container
if check_container "vtria-erp-db"; then
    echo -e "${GREEN}✓ MySQL database container is running${NC}"
else
    echo -e "${YELLOW}⚠ MySQL container not running. Starting...${NC}"
    docker start vtria-erp-db-1
    sleep 5
fi

# Check Backend API container
if check_container "vtria-erp-api"; then
    echo -e "${GREEN}✓ Backend API container is running${NC}"
    
    # Test API connectivity
    if curl -s http://localhost:3001/api/production/quality/checkpoints > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend API is responding${NC}"
    else
        echo -e "${YELLOW}⚠ Backend API not responding. Restarting...${NC}"
        docker restart vtria-erp-api-1
        sleep 10
    fi
else
    echo -e "${YELLOW}⚠ Backend API container not running. Starting...${NC}"
    docker start vtria-erp-api-1
    sleep 10
fi

echo ""
echo "Step 2: Checking React Development Server..."
echo "----------------------------------------------"

# Check React dev server
if check_port 3000; then
    echo -e "${GREEN}✓ React development server is running on port 3000${NC}"
else
    echo -e "${YELLOW}⚠ React dev server not running on port 3000${NC}"
    echo "  Note: The server should already be started manually."
    echo "  If not, run: cd client && npm start"
fi

echo ""
echo "Step 3: Testing Backend API Endpoints..."
echo "------------------------------------------"

# Test Quality endpoints
echo -n "Testing Quality API... "
if curl -s http://localhost:3001/api/production/quality/checkpoints > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Test Shop Floor endpoints
echo -n "Testing Shop Floor API... "
if curl -s http://localhost:3001/api/production/shopfloor/machines > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Test Planning endpoints
echo -n "Testing Planning API... "
if curl -s http://localhost:3001/api/production/planning/schedules > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo ""
echo "Step 4: System Information"
echo "---------------------------"
echo "Frontend URL: http://localhost:3000/vtria-erp"
echo "Backend API:  http://localhost:3001/api/production"
echo ""
echo "Test Credentials:"
echo "  Email:    test.payroll@vtria.com"
echo "  Password: [Your test password]"
echo ""

echo "Step 5: Available Dashboards"
echo "-----------------------------"
echo "1. Quality Control:      /production/quality"
echo "2. Shop Floor Control:   /production/shopfloor"
echo "3. Production Planning:  /production/planning"
echo ""

echo "================================================"
echo "   System Ready for Testing! 🚀"
echo "================================================"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Open browser: http://localhost:3000/vtria-erp"
echo "2. Login with test credentials"
echo "3. Navigate to Manufacturing → Quality Control"
echo "4. Follow the testing guide: PRODUCTION_TESTING_GUIDE.md"
echo ""
echo -e "${BLUE}Quick Test Commands:${NC}"
echo "# View backend logs"
echo "docker logs vtria-erp-api-1 -f --tail 100"
echo ""
echo "# Test Quality API"
echo "curl http://localhost:3001/api/production/quality/metrics/dashboard"
echo ""
echo "# Test Shop Floor API"
echo "curl http://localhost:3001/api/production/shopfloor/dashboard"
echo ""
echo "# Test Planning API"
echo "curl http://localhost:3001/api/production/planning/schedules"
echo ""
echo -e "${GREEN}Happy Testing! 📊${NC}"
