#!/bin/bash

# VTRIA ERP - Remote Deployment Script
# Deploy from MacBook to Windows Docker environment

set -e  # Exit on any error

# Configuration - Update these variables
WINDOWS_IP="YOUR_WINDOWS_IP_ADDRESS"
WINDOWS_USER="your_windows_username"
DOCKER_HOST="tcp://$WINDOWS_IP:2376"
PROJECT_PATH="/Users/srbhandary/Documents/Projects/vtria-erp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  VTRIA ERP - Remote Deployment${NC}"
echo -e "${BLUE}=======================================${NC}"
echo

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker is not running on MacBook${NC}"
    exit 1
fi

# Set Docker host to Windows machine
export DOCKER_HOST="$DOCKER_HOST"
echo -e "${YELLOW}Connecting to Windows Docker at $DOCKER_HOST${NC}"

# Test connection
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to Windows Docker${NC}"
    echo -e "${YELLOW}Make sure:${NC}"
    echo "  1. Docker Desktop is running on Windows"
    echo "  2. Remote API is enabled (tcp://0.0.0.0:2376)"
    echo "  3. Windows firewall allows port 2376"
    exit 1
fi

echo -e "${GREEN}✓ Connected to Windows Docker${NC}"

# Build API image
echo -e "${YELLOW}Building API image...${NC}"
cd "$PROJECT_PATH/api"
docker build -f Dockerfile.windows -t vtria-erp-api:latest .

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: API build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ API image built${NC}"

# Build client production build
echo -e "${YELLOW}Building client production bundle...${NC}"
cd "$PROJECT_PATH/client"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Client build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Client build complete${NC}"

# Tag and push images to Windows registry (if using registry)
# docker tag vtria-erp-api:latest $WINDOWS_IP:5000/vtria-erp-api:latest
# docker push $WINDOWS_IP:5000/vtria-erp-api:latest

# Sync source code to Windows
echo -e "${YELLOW}Syncing source code to Windows...${NC}"
rsync -avz --delete --exclude='node_modules' --exclude='.git' --exclude='*.log' --exclude='.DS_Store' \
  "$PROJECT_PATH/" \
  "$WINDOWS_USER@$WINDOWS_IP:/c/Projects/vtria-erp/"

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Code sync failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Code sync complete${NC}"

# Restart services on Windows
echo -e "${YELLOW}Restarting services on Windows...${NC}"
ssh "$WINDOWS_USER@$WINDOWS_IP" "cd /c/Projects/vtria-erp && docker-compose down && docker-compose up -d"

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Service restart failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Services restarted${NC}"

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Test deployment
echo -e "${YELLOW}Testing deployment...${NC}"
if curl -f -s "http://$WINDOWS_IP:3002/health" > /dev/null; then
    echo -e "${GREEN}✓ API is responding${NC}"
else
    echo -e "${RED}⚠ API health check failed${NC}"
fi

echo
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}  🚀 Deployment Complete!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo
echo -e "${BLUE}Access your application at:${NC}"
echo "  Frontend: http://$WINDOWS_IP:3000"
echo "  API:      http://$WINDOWS_IP:3002"
echo "  API Docs: http://$WINDOWS_IP:3002/api-docs"
echo "  Database: http://$WINDOWS_IP:8080"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test all features on Windows"
echo "  2. Check logs if any issues: docker-compose logs -f"
echo "  3. Monitor performance and adjust resources as needed"