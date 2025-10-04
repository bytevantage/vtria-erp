#!/bin/bash

# VTRIA ERP Start Script
# This script handles port cleanup and starts the application with Docker Compose

echo "🚀 Starting VTRIA ERP System..."

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -ti:$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    echo "   Freeing up port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
}

# Check and clean up required ports
echo "🔍 Checking for conflicting processes..."

PORTS_TO_CHECK=(3000 3001 3306 6379)
CONFLICTS_FOUND=false

for port in "${PORTS_TO_CHECK[@]}"; do
    if check_port $port; then
        echo "   ⚠️  Port $port is in use"
        CONFLICTS_FOUND=true
    fi
done

if [ "$CONFLICTS_FOUND" = true ]; then
    echo "🧹 Cleaning up conflicting processes..."
    for port in "${PORTS_TO_CHECK[@]}"; do
        if check_port $port; then
            kill_port $port
        fi
    done
    echo "   ✅ Ports cleaned up"
    
    # Give processes time to fully terminate
    sleep 2
else
    echo "   ✅ All ports are available"
fi

# Stop any existing Docker containers
echo "🐳 Stopping existing Docker containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Start the application
echo "🚀 Starting VTRIA ERP with Docker Compose..."
docker-compose up -d

# Check if containers started successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ VTRIA ERP started successfully!"
    echo ""
    echo "📱 Access the application:"
    echo "   Frontend: http://localhost:3000"
    echo "   API:      http://localhost:3001"
    echo "   Docs:     http://localhost:3001/api-docs"
    echo ""
    echo "🐳 Container status:"
    docker-compose ps
else
    echo ""
    echo "❌ Failed to start VTRIA ERP"
    echo "Check the logs with: docker-compose logs"
    exit 1
fi