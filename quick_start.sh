#!/bin/bash

# VTRIA ERP - Quick Start Script
# This script starts all required services for the Production Module

echo "🚀 VTRIA ERP - Quick Start"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check if Docker is running
echo "Step 1: Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running!${NC}"
    echo ""
    echo "Please start Docker Desktop:"
    echo "  1. Open Spotlight (Cmd + Space)"
    echo "  2. Type 'Docker'"
    echo "  3. Click 'Docker Desktop'"
    echo "  4. Wait for Docker to start (30-60 seconds)"
    echo ""
    echo "Then run this script again."
    exit 1
else
    echo -e "${GREEN}✓ Docker is running${NC}"
fi

# Step 2: Check if containers exist
echo ""
echo "Step 2: Checking containers..."

DB_EXISTS=$(docker ps -a --filter "name=vtria-erp-db" --format "{{.Names}}" 2>/dev/null)
API_EXISTS=$(docker ps -a --filter "name=vtria-erp-api" --format "{{.Names}}" 2>/dev/null)

if [ -z "$DB_EXISTS" ] || [ -z "$API_EXISTS" ]; then
    echo -e "${YELLOW}⚠ Containers don't exist. Creating them...${NC}"
    
    # Try docker-compose
    if [ -f "docker-compose.yml" ]; then
        echo "Using docker-compose to create containers..."
        docker-compose up -d --no-start
    else
        echo -e "${RED}✗ docker-compose.yml not found${NC}"
        echo "Please ensure you're in the project root directory."
        exit 1
    fi
else
    echo -e "${GREEN}✓ Containers exist${NC}"
fi

# Step 3: Start database
echo ""
echo "Step 3: Starting MySQL database..."

# Find the actual database container name
DB_CONTAINER=$(docker ps -a --filter "name=vtria.*db" --format "{{.Names}}" | head -n 1)

if [ -z "$DB_CONTAINER" ]; then
    echo -e "${RED}✗ Database container not found${NC}"
    exit 1
fi

docker start "$DB_CONTAINER" > /dev/null 2>&1
echo -e "${BLUE}⏳ Waiting for database to initialize (15 seconds)...${NC}"
sleep 15

# Check if database is running
if docker ps --filter "name=$DB_CONTAINER" --format "{{.Names}}" | grep -q "$DB_CONTAINER"; then
    echo -e "${GREEN}✓ Database is running${NC}"
else
    echo -e "${RED}✗ Failed to start database${NC}"
    echo "Check logs: docker logs $DB_CONTAINER"
    exit 1
fi

# Step 4: Start backend API
echo ""
echo "Step 4: Starting Backend API..."

# Find the actual API container name
API_CONTAINER=$(docker ps -a --filter "name=vtria.*api" --format "{{.Names}}" | head -n 1)

if [ -z "$API_CONTAINER" ]; then
    echo -e "${RED}✗ API container not found${NC}"
    exit 1
fi

docker start "$API_CONTAINER" > /dev/null 2>&1
echo -e "${BLUE}⏳ Waiting for API to start (15 seconds)...${NC}"
sleep 15

# Check if API is running
if docker ps --filter "name=$API_CONTAINER" --format "{{.Names}}" | grep -q "$API_CONTAINER"; then
    echo -e "${GREEN}✓ Backend API is running${NC}"
else
    echo -e "${RED}✗ Failed to start API${NC}"
    echo "Check logs: docker logs $API_CONTAINER"
    exit 1
fi

# Step 5: Test API connectivity
echo ""
echo "Step 5: Testing API connectivity..."

MAX_RETRIES=6
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3001/api/production/quality/checkpoints > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API is responding!${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}⏳ Attempt $RETRY_COUNT/$MAX_RETRIES - API not responding yet, waiting...${NC}"
            sleep 5
        else
            echo -e "${RED}✗ API is not responding after $MAX_RETRIES attempts${NC}"
            echo ""
            echo "Troubleshooting:"
            echo "1. Check API logs: docker logs $API_CONTAINER"
            echo "2. Verify database is accessible: docker exec $API_CONTAINER nc -zv db 3306"
            echo "3. Try restarting: docker restart $API_CONTAINER"
            exit 1
        fi
    fi
done

# Step 6: Check React server
echo ""
echo "Step 6: Checking React development server..."

if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ React server is running on port 3000${NC}"
else
    echo -e "${YELLOW}⚠ React server is not running${NC}"
    echo ""
    echo "Starting React development server..."
    echo "Run this command in a new terminal:"
    echo ""
    echo -e "${BLUE}cd client && npx react-app-rewired start${NC}"
    echo ""
    echo "Or if you're already in the client directory:"
    echo -e "${BLUE}npx react-app-rewired start${NC}"
fi

# Step 7: Summary
echo ""
echo "================================"
echo -e "${GREEN}🎉 Backend services are ready!${NC}"
echo "================================"
echo ""
echo "Service Status:"
echo "  🗄️  MySQL Database: $DB_CONTAINER"
echo "  🚀 Backend API:     $API_CONTAINER"
echo "  📊 React Frontend:  http://localhost:3000/vtria-erp"
echo ""
echo "API Endpoints:"
echo "  • Quality:      http://localhost:3001/api/production/quality"
echo "  • Shop Floor:   http://localhost:3001/api/production/shopfloor"
echo "  • Planning:     http://localhost:3001/api/production/planning"
echo ""
echo "Next Steps:"
echo "  1. Ensure React server is running (see above)"
echo "  2. Open browser: http://localhost:3000/vtria-erp"
echo "  3. Login with: test.payroll@vtria.com"
echo "  4. Check connection status - should show 'API Connected'"
echo ""
echo "View logs:"
echo "  • API logs:  docker logs $API_CONTAINER -f"
echo "  • DB logs:   docker logs $DB_CONTAINER -f"
echo ""
echo -e "${GREEN}Ready for testing! 🚀${NC}"
