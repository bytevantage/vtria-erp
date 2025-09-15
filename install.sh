#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}VTRIA ERP System Installation Script${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create necessary directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p uploads/documents/{purchase_orders,proforma_invoices,quotations,invoices}
mkdir -p logs
mkdir -p mysql_data
mkdir -p redis_data

# Check if .env exists, if not create from template
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.production.template .env
    echo -e "${RED}Please edit .env file with your configuration before continuing${NC}"
    exit 1
fi

# Pull Docker images
echo -e "${YELLOW}Pulling Docker images...${NC}"
docker-compose pull

# Start the system
echo -e "${YELLOW}Starting VTRIA ERP System...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose exec api npm run migrate

# Check if services are running
echo -e "${YELLOW}Checking services...${NC}"
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}Installation successful!${NC}"
    echo -e "Your VTRIA ERP System is running at: ${GREEN}http://localhost:3000${NC}"
    echo -e "API is accessible at: ${GREEN}http://localhost:5000${NC}"
    echo -e "\nTo stop the system: ${YELLOW}docker-compose down${NC}"
    echo -e "To start the system: ${YELLOW}docker-compose up -d${NC}"
    echo -e "To view logs: ${YELLOW}docker-compose logs -f${NC}"
else
    echo -e "${RED}Installation failed. Please check the logs with: docker-compose logs${NC}"
    exit 1
fi
