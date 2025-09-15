#!/bin/bash

echo "🛑 VTRIA Engineering Solutions Pvt Ltd"
echo "� Stopping VTRIA ERP System..."
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")"

# Run comprehensive port cleanup
echo -e "${YELLOW}🧹 Cleaning up processes and ports...${NC}"
if [ -f "./cleanup_ports.sh" ]; then
    ./cleanup_ports.sh
else
    # Fallback cleanup if script doesn't exist
    pkill -f "react-scripts" 2>/dev/null || true
    pkill -f "node.*server.js" 2>/dev/null || true
    for port in 3000 3001; do
        pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            echo -e "${YELLOW}   Killing processes on port $port: $pids${NC}"
            kill -9 $pids 2>/dev/null || true
        fi
    done
fi

# Stop Docker containers
echo -e "${YELLOW}🛢️  Stopping Docker containers...${NC}"
docker-compose down

# Additional cleanup for any remaining VTRIA processes
echo -e "${YELLOW}🔍 Final cleanup check...${NC}"
pkill -f "vtria" 2>/dev/null || true

# Remove PID files if they exist
echo -e "${YELLOW}� Cleaning up PID files...${NC}"
rm -f logs/*.pid 2>/dev/null || true

echo -e "${GREEN}✅ VTRIA ERP System stopped successfully!${NC}"
echo -e "${GREEN}📱 Ports 3000 and 3001 are now free for next startup${NC}"
echo ""
echo "💡 Use ./launch_vtria_erp.sh to start the system"
