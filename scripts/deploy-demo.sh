#!/bin/bash

# VTRIA ERP - Demo Deployment Script
# Deploys the demo version for client demonstrations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/opt/vtria-erp-demo"
BACKUP_DIR="/opt/backups/vtria-erp-demo"
DOCKER_IMAGE="vtria-erp:latest-demo"
CONTAINER_NAME="vtria-erp-demo"
PORT="3000"

# Functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_status "Dependencies check passed"
}

# Create backup
create_backup() {
    if [ -d "$DEPLOY_DIR" ]; then
        print_status "Creating backup..."
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r "$DEPLOY_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        print_status "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    fi
}

# Stop existing container
stop_container() {
    print_status "Stopping existing container..."
    
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        docker stop $CONTAINER_NAME
        print_status "Container stopped"
    fi
    
    if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
        docker rm $CONTAINER_NAME
        print_status "Container removed"
    fi
}

# Pull latest image
pull_image() {
    print_status "Pulling latest demo image..."
    docker pull $DOCKER_IMAGE
    print_status "Image pulled successfully"
}

# Deploy application
deploy_app() {
    print_status "Deploying VTRIA ERP Demo..."
    
    # Create deployment directory
    mkdir -p "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    
    # Create docker-compose file for demo
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  vtria-erp-demo:
    image: $DOCKER_IMAGE
    container_name: $CONTAINER_NAME
    ports:
      - "$PORT:3000"
    environment:
      - NODE_ENV=demo
      - DEMO_MODE=true
      - RESET_DATA=true
      - SESSION_TIMEOUT=7200
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  demo-db:
    image: mysql:8.0
    container_name: vtria-erp-demo-db
    environment:
      - MYSQL_ROOT_PASSWORD=demo123456
      - MYSQL_DATABASE=vtria_demo
      - MYSQL_USER=demo
      - MYSQL_PASSWORD=demo123456
    volumes:
      - demo-db-data:/var/lib/mysql
      - ./sql/demo-data:/docker-entrypoint-initdb.d
    ports:
      - "3307:3306"
    restart: unless-stopped

volumes:
  demo-db-data:
EOF

    # Start the application
    docker-compose up -d
    
    print_status "Application deployed successfully"
}

# Wait for application to be ready
wait_for_ready() {
    print_status "Waiting for application to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:$PORT/health &>/dev/null; then
            print_status "Application is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - Waiting..."
        sleep 10
        ((attempt++))
    done
    
    print_error "Application failed to become ready within expected time"
    return 1
}

# Setup demo data
setup_demo_data() {
    print_status "Setting up demo data..."
    
    # Wait for database to be ready
    sleep 30
    
    # Run demo data setup
    docker exec $CONTAINER_NAME npm run setup-demo-data || {
        print_warning "Demo data setup failed, but continuing..."
    }
    
    print_status "Demo data setup completed"
}

# Show deployment info
show_deployment_info() {
    print_header "Deployment Complete"
    
    echo -e "${GREEN}🎉 VTRIA ERP Demo deployed successfully!${NC}"
    echo ""
    echo "📱 Access Information:"
    echo "   URL: http://localhost:$PORT"
    echo "   Username: demo@vtria.com"
    echo "   Password: Demo@123456"
    echo ""
    echo "🔧 Management Commands:"
    echo "   View logs: docker logs -f $CONTAINER_NAME"
    echo "   Stop: docker stop $CONTAINER_NAME"
    echo "   Restart: docker restart $CONTAINER_NAME"
    echo "   Reset data: docker exec $CONTAINER_NAME npm run reset-demo-data"
    echo ""
    echo "⏰ Demo Features:"
    echo "   - Session timeout: 2 hours"
    echo "   - Auto-reset capability"
    echo "   - Sample data pre-loaded"
    echo "   - Max 5 concurrent users"
    echo ""
    echo "📁 Deployment Directory: $DEPLOY_DIR"
    echo "🗂️  Backup Location: $BACKUP_DIR"
}

# Main execution
main() {
    print_header "VTRIA ERP Demo Deployment"
    
    # Check prerequisites
    check_root
    check_dependencies
    
    # Deployment steps
    create_backup
    stop_container
    pull_image
    deploy_app
    wait_for_ready
    setup_demo_data
    show_deployment_info
    
    print_status "Demo deployment completed successfully!"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
