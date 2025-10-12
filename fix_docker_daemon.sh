#!/bin/bash

# VTRIA ERP - Docker Daemon Fix Script
# Fixes the "Cannot connect to Docker daemon" issue

set -e

echo "🔧 VTRIA ERP - Docker Daemon Fix"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if Docker daemon is accessible
check_docker() {
    if docker ps >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Step 1: Check current Docker status
print_status "Checking Docker daemon status..."
if check_docker; then
    print_success "Docker daemon is already accessible!"
    echo ""
    print_status "Checking if containers are running..."
    docker ps
    exit 0
else
    print_warning "Docker daemon is not accessible - proceeding with fix..."
fi

echo ""

# Step 2: Kill Docker processes
print_status "Stopping Docker Desktop..."
pkill -9 Docker 2>/dev/null || true
sleep 5
print_success "Docker Desktop stopped"

echo ""

# Step 3: Restart Docker Desktop
print_status "Starting Docker Desktop..."
open -a Docker

print_status "Waiting for Docker to initialize (90 seconds)..."
echo ""
for i in {1..18}; do
    echo -n "█"
    sleep 5
done
echo ""
echo ""

# Step 4: Wait for Docker daemon to be ready
print_status "Testing Docker daemon connection..."
MAX_ATTEMPTS=12
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if check_docker; then
        print_success "Docker daemon is accessible!"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "   Attempt $ATTEMPT/$MAX_ATTEMPTS - waiting 5 more seconds..."
        sleep 5
    fi
done

if ! check_docker; then
    print_error "Docker daemon still not accessible after restart"
    echo ""
    echo "Please try one of these options:"
    echo "  1. Open Docker Desktop manually and check for errors"
    echo "  2. Reset Docker Desktop: Settings → Troubleshoot → Reset to factory defaults"
    echo "  3. Run backend without Docker (see DOCKER_DAEMON_FIX.md Option 2)"
    exit 1
fi

echo ""

# Step 5: Show Docker info
print_status "Docker status:"
docker ps -a --filter "name=vtria" || true

echo ""

# Step 6: Start containers if they exist
print_status "Starting VTRIA ERP containers..."

if docker ps -a --format '{{.Names}}' | grep -q "vtria-erp-db-1"; then
    print_status "Starting database container..."
    docker start vtria-erp-db-1
    sleep 15
    print_success "Database container started"
else
    print_warning "Database container not found - you may need to run: docker-compose up -d"
fi

echo ""

if docker ps -a --format '{{.Names}}' | grep -q "vtria-erp-api-1"; then
    print_status "Starting API container..."
    docker start vtria-erp-api-1
    sleep 15
    print_success "API container started"
else
    print_warning "API container not found - you may need to run: docker-compose up -d"
fi

echo ""

# Step 7: Test API connection
print_status "Testing API connection..."
sleep 5

if curl -s http://localhost:3001/api/production/quality/checkpoints >/dev/null 2>&1; then
    print_success "API is responding!"
    echo ""
    print_success "✅ All systems operational!"
    echo ""
    echo "You can now:"
    echo "  • Open http://localhost:3000/vtria-erp"
    echo "  • Start testing the Production Module"
    echo ""
else
    print_warning "API not responding yet (this is normal if containers are still starting)"
    echo ""
    echo "Wait 30 seconds and check manually:"
    echo "  docker ps"
    echo "  curl http://localhost:3001/api/production/quality/checkpoints"
    echo ""
fi

# Show final status
print_status "Final container status:"
docker ps --filter "name=vtria"

echo ""
print_success "Docker daemon fix complete!"
