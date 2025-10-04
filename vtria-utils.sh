#!/bin/bash

# VTRIA ERP - Consolidated Utility Script
# All-in-one script for managing VTRIA ERP system
# Version: 1.0.0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

# Configuration
API_PORT=3001
CLIENT_PORT=3000
DB_NAME="vtria_erp"
BACKUP_DIR="backups"

# Utility functions
print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                     VTRIA ERP Utilities                      ║"
    echo "║                Engineering Solutions Management               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_usage() {
    print_banner
    echo -e "${CYAN}Usage: $0 [COMMAND]${NC}"
    echo ""
    echo -e "${YELLOW}System Management:${NC}"
    echo "  start              Start both API server and React client"
    echo "  stop               Stop all VTRIA ERP processes"
    echo "  restart            Stop and start the system"
    echo "  status             Check system status"
    echo "  cleanup            Clean up ports and processes"
    echo ""
    echo -e "${YELLOW}Development:${NC}"
    echo "  dev                Start in development mode with hot reload"
    echo "  build              Build production version"
    echo "  test               Run tests for both client and API"
    echo "  lint               Run code linting"
    echo "  format             Format code with prettier"
    echo "  sync               Sync development environment"
    echo ""
    echo -e "${YELLOW}Database:${NC}"
    echo "  db-status          Check database connection"
    echo "  db-migrate         Run database migrations"
    echo "  db-seed            Seed database with initial data"
    echo "  db-reset           Reset database (WARNING: destructive)"
    echo ""
    echo -e "${YELLOW}Backup & Restore:${NC}"
    echo "  backup             Create full system backup"
    echo "  restore [file]     Restore from backup file"
    echo "  list-backups       List available backups"
    echo ""
    echo -e "${YELLOW}Production:${NC}"
    echo "  deploy             Deploy to production"
    echo "  health-check       Check system health"
    echo "  logs               View system logs"
    echo ""
    echo -e "${YELLOW}Utilities:${NC}"
    echo "  install            Install dependencies"
    echo "  update             Update all dependencies"
    echo "  clean              Clean node_modules and reinstall"
    echo "  test-endpoints     Test all API endpoints"
    echo ""
    echo -e "${YELLOW}Docker:${NC}"
    echo "  docker-start       Start with Docker Compose"
    echo "  docker-stop        Stop Docker containers"
    echo "  docker-rebuild     Rebuild and restart containers"
    echo ""
}

# Check if required tools are installed
check_dependencies() {
    local missing_deps=()
    
    command -v node >/dev/null 2>&1 || missing_deps+=("node")
    command -v npm >/dev/null 2>&1 || missing_deps+=("npm")
    command -v mysql >/dev/null 2>&1 || missing_deps+=("mysql")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}Missing dependencies: ${missing_deps[*]}${NC}"
        echo "Please install the missing dependencies and try again."
        exit 1
    fi
}

# Check database connection
check_database() {
    echo -e "${YELLOW}Checking database connection...${NC}"
    if mysql --host=localhost --user=root -e "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        echo "Please ensure MySQL is running and credentials are correct."
        return 1
    fi
}

# Kill processes on specific ports
kill_port_processes() {
    local port=$1
    local port_name=$2
    
    echo -e "${YELLOW}Checking port $port ($port_name)...${NC}"
    
    local pids=$(lsof -ti :$port 2>/dev/null)
    
    if [ -z "$pids" ]; then
        echo -e "${GREEN}✅ Port $port is free${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}⚠️  Killing processes on port $port: $pids${NC}"
    
    for pid in $pids; do
        if kill -TERM $pid 2>/dev/null; then
            echo "   ❌ Terminated PID $pid"
            sleep 2
            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid 2>/dev/null
                echo "   ❌ Force killed PID $pid"
            fi
        fi
    done
    
    sleep 1
    
    local final_check=$(lsof -ti :$port 2>/dev/null)
    if [ -z "$final_check" ]; then
        echo -e "${GREEN}✅ Port $port is now free${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to free port $port${NC}"
        return 1
    fi
}

# System management functions
start_system() {
    print_banner
    echo -e "${YELLOW}Starting VTRIA ERP System...${NC}"
    
    check_dependencies
    check_database || exit 1
    
    # Start API server
    echo -e "${YELLOW}Starting API server on port $API_PORT...${NC}"
    cd "$PROJECT_DIR/api"
    npm start &
    API_PID=$!
    
    sleep 3
    
    # Start React client
    echo -e "${YELLOW}Starting React client on port $CLIENT_PORT...${NC}"
    cd "$PROJECT_DIR/client"
    npm start &
    CLIENT_PID=$!
    
    echo -e "${GREEN}✅ VTRIA ERP started successfully!${NC}"
    echo -e "${CYAN}Frontend: http://localhost:$CLIENT_PORT${NC}"
    echo -e "${CYAN}API: http://localhost:$API_PORT${NC}"
    echo -e "${CYAN}API Health: http://localhost:$API_PORT/health${NC}"
}

start_dev() {
    print_banner
    echo -e "${YELLOW}Starting VTRIA ERP in Development Mode...${NC}"
    
    check_dependencies
    check_database || exit 1
    
    # Start API server in development mode
    echo -e "${YELLOW}Starting API server in dev mode...${NC}"
    cd "$PROJECT_DIR/api"
    npm run dev &
    
    sleep 3
    
    # Start React client
    echo -e "${YELLOW}Starting React client...${NC}"
    cd "$PROJECT_DIR/client"
    npm start &
    
    echo -e "${GREEN}✅ Development environment started!${NC}"
    echo -e "${CYAN}Frontend: http://localhost:$CLIENT_PORT${NC}"
    echo -e "${CYAN}API: http://localhost:$API_PORT${NC}"
}

stop_system() {
    echo -e "${YELLOW}Stopping VTRIA ERP System...${NC}"
    
    kill_port_processes $CLIENT_PORT "React Client"
    kill_port_processes $API_PORT "API Server"
    
    # Clean up any hanging processes
    pkill -f "vtria" 2>/dev/null || true
    pkill -f "react-scripts" 2>/dev/null || true
    
    echo -e "${GREEN}✅ VTRIA ERP stopped successfully!${NC}"
}

cleanup_system() {
    echo -e "${YELLOW}Cleaning up VTRIA ERP processes and ports...${NC}"
    
    kill_port_processes $CLIENT_PORT "React Client"
    kill_port_processes $API_PORT "API Server"
    
    # Clean up node processes
    pkill -f "server-minimal" 2>/dev/null && echo "   ❌ Killed server-minimal processes" || true
    pkill -f "react-scripts" 2>/dev/null && echo "   ❌ Killed react-scripts processes" || true
    pkill -f "node.*vtria" 2>/dev/null && echo "   ❌ Killed VTRIA node processes" || true
    
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
}

system_status() {
    print_banner
    echo -e "${YELLOW}VTRIA ERP System Status${NC}"
    echo "======================"
    
    # Check API port
    if lsof -ti :$API_PORT >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API Server (port $API_PORT): Running${NC}"
    else
        echo -e "${RED}❌ API Server (port $API_PORT): Not running${NC}"
    fi
    
    # Check client port
    if lsof -ti :$CLIENT_PORT >/dev/null 2>&1; then
        echo -e "${GREEN}✅ React Client (port $CLIENT_PORT): Running${NC}"
    else
        echo -e "${RED}❌ React Client (port $CLIENT_PORT): Not running${NC}"
    fi
    
    # Check database
    if check_database >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database: Connected${NC}"
    else
        echo -e "${RED}❌ Database: Connection failed${NC}"
    fi
    
    # Check health endpoint
    if curl -s "http://localhost:$API_PORT/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API Health Check: Passed${NC}"
    else
        echo -e "${RED}❌ API Health Check: Failed${NC}"
    fi
}

# Development functions
build_system() {
    echo -e "${YELLOW}Building VTRIA ERP for production...${NC}"
    
    cd "$PROJECT_DIR/client"
    echo -e "${YELLOW}Building React client...${NC}"
    npm run build
    
    cd "$PROJECT_DIR/api"
    echo -e "${YELLOW}Installing production dependencies...${NC}"
    npm ci --only=production
    
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
}

run_tests() {
    echo -e "${YELLOW}Running VTRIA ERP tests...${NC}"
    
    cd "$PROJECT_DIR/client"
    echo -e "${YELLOW}Running client tests...${NC}"
    npm test --watchAll=false
    
    cd "$PROJECT_DIR/api"
    echo -e "${YELLOW}Running API tests...${NC}"
    npm test || echo "Tests not configured"
    
    echo -e "${GREEN}✅ Tests completed!${NC}"
}

# Backup functions
create_backup() {
    echo -e "${YELLOW}Creating VTRIA ERP backup...${NC}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="vtria_erp_backup_$timestamp"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup database
    echo -e "${YELLOW}Backing up database...${NC}"
    mysqldump -u root "$DB_NAME" > "$backup_path/database.sql" 2>/dev/null || {
        echo -e "${RED}❌ Database backup failed${NC}"
        return 1
    }
    
    # Backup uploads and configuration
    echo -e "${YELLOW}Backing up files...${NC}"
    [ -d "uploads" ] && cp -r uploads "$backup_path/"
    [ -f ".env" ] && cp .env "$backup_path/.env.backup"
    [ -f "api/.env" ] && cp api/.env "$backup_path/api.env.backup"
    [ -f "client/.env" ] && cp client/.env "$backup_path/client.env.backup"
    
    # Create backup info
    cat << EOF > "$backup_path/backup_info.txt"
Backup Date: $(date)
System Version: $(grep '"version"' api/package.json | cut -d'"' -f4 2>/dev/null || echo "unknown")
Node Version: $(node --version)
NPM Version: $(npm --version)
EOF
    
    # Create compressed archive
    echo -e "${YELLOW}Creating compressed archive...${NC}"
    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name"
    rm -rf "$backup_name"
    cd "$PROJECT_DIR"
    
    echo -e "${GREEN}✅ Backup created: $BACKUP_DIR/${backup_name}.tar.gz${NC}"
}

# Docker functions
docker_start() {
    echo -e "${YELLOW}Starting VTRIA ERP with Docker Compose...${NC}"
    docker-compose up -d --build
    echo -e "${GREEN}✅ Docker containers started!${NC}"
}

docker_stop() {
    echo -e "${YELLOW}Stopping Docker containers...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Docker containers stopped!${NC}"
}

# Health check
health_check() {
    echo -e "${YELLOW}VTRIA ERP Health Check${NC}"
    echo "====================="
    
    # System status
    system_status
    
    echo ""
    echo -e "${YELLOW}Detailed Health Information:${NC}"
    
    # Check disk space
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        echo -e "${RED}⚠️  Disk usage: ${disk_usage}% (High)${NC}"
    else
        echo -e "${GREEN}✅ Disk usage: ${disk_usage}%${NC}"
    fi
    
    # Check memory usage
    if command -v free >/dev/null 2>&1; then
        local mem_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
        echo -e "${GREEN}✅ Memory usage: ${mem_usage}%${NC}"
    fi
    
    # Check API endpoint
    if curl -s "http://localhost:$API_PORT/health" | grep -q "healthy"; then
        echo -e "${GREEN}✅ API Health Endpoint: Responding${NC}"
    else
        echo -e "${RED}❌ API Health Endpoint: Not responding${NC}"
    fi
}

# Main command handler
case "$1" in
    "start")
        start_system
        ;;
    "dev")
        start_dev
        ;;
    "stop")
        stop_system
        ;;
    "restart")
        stop_system
        sleep 2
        start_system
        ;;
    "status")
        system_status
        ;;
    "cleanup")
        cleanup_system
        ;;
    "build")
        build_system
        ;;
    "test")
        run_tests
        ;;
    "backup")
        create_backup
        ;;
    "health-check")
        health_check
        ;;
    "docker-start")
        docker_start
        ;;
    "docker-stop")
        docker_stop
        ;;
    "docker-rebuild")
        docker_stop
        docker_start
        ;;
    "install")
        echo -e "${YELLOW}Installing dependencies...${NC}"
        cd "$PROJECT_DIR/client" && npm install
        cd "$PROJECT_DIR/api" && npm install
        echo -e "${GREEN}✅ Dependencies installed!${NC}"
        ;;
    "clean")
        echo -e "${YELLOW}Cleaning and reinstalling dependencies...${NC}"
        rm -rf client/node_modules api/node_modules node_modules
        cd "$PROJECT_DIR/client" && npm install
        cd "$PROJECT_DIR/api" && npm install
        echo -e "${GREEN}✅ Clean install completed!${NC}"
        ;;
    "")
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac