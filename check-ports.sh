#!/bin/bash

# Check if ports are available for VTRIA ERP
echo "Checking port availability for VTRIA ERP..."

# Ports used by VTRIA ERP
PORTS=(80 3001 3306 6379)
SERVICES=("Client (Web)" "API" "MySQL Database" "Redis")

echo ""
echo "Port Status:"
echo "============"

for i in "${!PORTS[@]}"; do
    PORT=${PORTS[$i]}
    SERVICE=${SERVICES[$i]}
    
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Port $PORT ($SERVICE): IN USE"
        echo "   Process using port $PORT:"
        lsof -Pi :$PORT -sTCP:LISTEN
        echo ""
    else
        echo "✅ Port $PORT ($SERVICE): Available"
    fi
done

echo ""
echo "Solutions for port conflicts:"
echo "=============================="
echo "1. Stop existing services using these ports"
echo "2. Modify docker-compose.yml to use different ports"
echo "3. Use docker-compose down to stop existing VTRIA containers"
echo ""

# Check if Docker containers are running
if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "vtria\|mysql\|redis"; then
    echo "Running Docker containers that might be using ports:"
    echo "===================================================="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(vtria|mysql|redis|CONTAINER)"
    echo ""
    echo "To stop all VTRIA containers, run:"
    echo "docker-compose down"
    echo "docker system prune -f"
fi
