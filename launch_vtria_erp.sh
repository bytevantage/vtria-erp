#!/bin/bash

# VTRIA ERP System Launch Script
# This script will start the complete ERP system

echo "🏢 VTRIA Engineering Solutions Pvt Ltd"
echo "🚀 Starting VTRIA ERP System..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Pre-launch cleanup to ensure consistent ports
echo -e "${BLUE}🧹 Pre-launch cleanup...${NC}"
if [ -f "./cleanup_ports.sh" ]; then
    ./cleanup_ports.sh
else
    echo -e "${YELLOW}⚠️  cleanup_ports.sh not found, doing basic cleanup...${NC}"
    pkill -f "react-scripts" 2>/dev/null || true
    pkill -f "node.*server.js" 2>/dev/null || true
fi

# Check prerequisites
echo -e "${BLUE}📋 Checking Prerequisites...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js${NC}"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
else
    echo -e "${RED}❌ npm not found. Please install npm${NC}"
    exit 1
fi

# Check Docker
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"
else
    echo -e "${RED}❌ Docker not found. Please install Docker${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🛢️  Starting Database...${NC}"

# Start database container
cd "$(dirname "$0")"
docker-compose up -d

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 5

# Test database connection
if docker exec vtria-erp-db-1 mysql -u vtria_user -pdev_password vtria_erp -e "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✅ Database is ready!${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🖥️  Starting Backend API Server...${NC}"

# Start backend server in background
cd api
nohup node src/server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid

# Wait for backend to start
sleep 3

# Test backend connection
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ Backend API Server is running on http://localhost:3001${NC}"
else
    echo -e "${RED}❌ Backend server failed to start${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🌐 Starting Frontend React App...${NC}"

# Start frontend
cd ../client

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

# Start React app in background with forced port
echo -e "${YELLOW}🌐 Starting React app on port 3000...${NC}"
PORT=3000 nohup npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
echo -e "${GREEN}✅ Frontend started on http://localhost:3000${NC}"

echo ""
echo -e "${GREEN}🎉 VTRIA ERP System is starting up!${NC}"
echo ""
echo -e "${BLUE}📱 Access URLs:${NC}"
echo -e "   Frontend: ${GREEN}http://localhost:3000${NC} (Consistent Port)"
echo -e "   Backend:  ${GREEN}http://localhost:3001${NC} (Consistent Port)"
echo -e "   Health:   ${GREEN}http://localhost:3001/health${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   - Wait 30-60 seconds for React app to fully load"
echo "   - Check logs in the 'logs' folder if there are issues"
echo "   - Use ./stop_vtria_erp.sh to stop all services"
echo ""
echo -e "${GREEN}✨ VTRIA ERP System launched successfully!${NC}"

# Wait a bit and try to open browser
sleep 10
if command -v open &> /dev/null; then
    echo -e "${BLUE}🌐 Opening browser...${NC}"
    open http://localhost:3000
fi
