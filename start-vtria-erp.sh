#!/bin/bash

# VTRIA ERP Startup Script
# This script starts both API and Client servers

echo "🚀 Starting VTRIA ERP System..."
echo "=================================="

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down VTRIA ERP System..."
    kill $API_PID $CLIENT_PID 2>/dev/null
    exit 0
}

# Set trap for cleanup on script exit
trap cleanup EXIT INT TERM

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if API directory exists
if [ -d "api" ]; then
    echo -e "${BLUE}📡 Starting API Server...${NC}"
    cd api
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing API dependencies...${NC}"
        npm install
    fi
    
    # Start API server in background
    npm run dev > ../logs/api.log 2>&1 &
    API_PID=$!
    cd ..
    echo -e "${GREEN}✅ API Server started (PID: $API_PID)${NC}"
    echo -e "${BLUE}   API running at: http://localhost:3001${NC}"
else
    echo -e "${RED}❌ API directory not found!${NC}"
    exit 1
fi

# Check if Client directory exists
if [ -d "client" ]; then
    echo -e "${BLUE}💻 Starting Client Server...${NC}"
    cd client
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing Client dependencies...${NC}"
        npm install
    fi
    
    # Start client server in background
    npm start > ../logs/client.log 2>&1 &
    CLIENT_PID=$!
    cd ..
    echo -e "${GREEN}✅ Client Server started (PID: $CLIENT_PID)${NC}"
    echo -e "${BLUE}   Client running at: http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  Client directory not found - API only mode${NC}"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

echo ""
echo -e "${GREEN}🎉 VTRIA ERP System is running!${NC}"
echo "=================================="
echo -e "${BLUE}API Server:    http://localhost:3001${NC}"
if [ ! -z "$CLIENT_PID" ]; then
    echo -e "${BLUE}Client App:    http://localhost:3000${NC}"
fi
echo -e "${BLUE}API Docs:      http://localhost:3001/api-docs${NC}"
echo ""
echo -e "${YELLOW}📊 System Status:${NC}"
echo "  • Case Management: ✅ Implemented"
echo "  • Product Tracking: ✅ Enhanced"
echo "  • User Roles: ✅ Updated"
echo "  • Workflow: ✅ Enquiry → Estimation → Quotation"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for both processes
if [ ! -z "$CLIENT_PID" ]; then
    wait $API_PID $CLIENT_PID
else
    wait $API_PID
fi