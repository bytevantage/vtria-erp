#!/bin/bash

# VTRIA ERP Management Script
# Controls starting, stopping, and managing the entire VTRIA ERP system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to print colored output
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

# Function to check if running as root (for port operations)
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. Be careful with system-wide operations."
    fi
}

# Function to kill processes on specific ports
kill_port_processes() {
    local ports=("3000" "3001" "3002" "3003" "3004" "3005" "5000" "3306" "6379")
    
    print_status "Cleaning up processes on ports..."
    
    for port in "${ports[@]}"; do
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            for pid in $pids; do
                print_status "Killing process $pid on port $port"
                kill -9 $pid 2>/dev/null || true
            done
        fi
    done
    
    sleep 2
    print_status "Port cleanup completed"
}

# Function to stop Docker containers
stop_docker() {
    print_status "Stopping Docker containers..."
    cd "$PROJECT_ROOT"
    
    # Stop main containers
    if [ -f "docker-compose.yml" ]; then
        docker-compose down --remove-orphans 2>/dev/null || true
    fi
    
    # Stop dev containers
    if [ -f "docker-compose.dev.yml" ]; then
        docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
    fi
    
    # Stop prod containers
    if [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml down --remove-orphans 2>/dev/null || true
    fi
    
    print_status "Docker containers stopped"
}

# Function to stop Node.js processes
stop_node_processes() {
    print_status "Stopping Node.js processes..."
    
    # Kill any remaining Node processes related to the project
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "npm.*start" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    pkill -f "react-scripts" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    
    print_status "Node.js processes stopped"
}

# Function to start in development mode
start_dev() {
    print_header "Starting VTRIA ERP - Development Mode"
    
    cd "$PROJECT_ROOT"
    
    # Stop any existing processes
    stop_all_silent
    
    # Check dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing root dependencies..."
        npm install
    fi
    
    # Make start-dev.sh executable
    chmod +x scripts/start-dev.sh
    
    # Start development environment
    print_status "Starting development environment..."
    ./scripts/start-dev.sh
}

# Function to start in production mode
start_prod() {
    print_header "Starting VTRIA ERP - Production Mode"
    
    cd "$PROJECT_ROOT"
    
    # Stop any existing processes
    stop_all_silent
    
    # Check if docker-compose exists
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found. Cannot start in production mode."
        exit 1
    fi
    
    # Start with Docker
    print_status "Starting with Docker Compose..."
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        print_status "✅ VTRIA ERP started successfully!"
        echo ""
        echo "📱 Access the application:"
        echo "   Frontend: http://localhost:3000"
        echo "   API:      http://localhost:3001"
        echo ""
        echo "🐳 Container status:"
        docker-compose ps
    else
        print_error "❌ Failed to start VTRIA ERP"
        exit 1
    fi
}

# Function to start with existing start.sh
start_default() {
    print_header "Starting VTRIA ERP - Default Mode"
    
    cd "$PROJECT_ROOT"
    
    # Make start.sh executable
    chmod +x scripts/start.sh
    
    # Run the existing start script
    ./scripts/start.sh
}

# Silent stop function (used internally)
stop_all_silent() {
    kill_port_processes > /dev/null 2>&1
    stop_docker > /dev/null 2>&1
    stop_node_processes > /dev/null 2>&1
}

# Function to stop everything
stop_all() {
    print_header "Stopping VTRIA ERP System"
    
    kill_port_processes
    stop_docker
    stop_node_processes
    
    print_status "✅ All VTRIA ERP processes stopped"
}

# Function to show status
show_status() {
    print_header "VTRIA ERP System Status"
    
    cd "$PROJECT_ROOT"
    
    echo -e "${BLUE}Docker Containers:${NC}"
    if command -v docker-compose &> /dev/null; then
        docker-compose ps 2>/dev/null || echo "No Docker containers running"
    else
        echo "Docker Compose not available"
    fi
    
    echo ""
    echo -e "${BLUE}Port Status:${NC}"
    local ports=("3000" "3001" "3306" "6379")
    
    for port in "${ports[@]}"; do
        if lsof -ti:$port >/dev/null 2>&1; then
            local pid=$(lsof -ti:$port)
            local process=$(ps -p $pid -o comm= 2>/dev/null || echo "Unknown")
            echo -e "   Port $port: ${GREEN}In use${NC} (PID: $pid, Process: $process)"
        else
            echo -e "   Port $port: ${RED}Free${NC}"
        fi
    done
    
    echo ""
    echo -e "${BLUE}Node.js Processes:${NC}"
    if pgrep -f "node.*server.js" > /dev/null; then
        echo -e "   API Server: ${GREEN}Running${NC}"
    else
        echo -e "   API Server: ${RED}Not running${NC}"
    fi
    
    if pgrep -f "react-scripts" > /dev/null; then
        echo -e "   Client App: ${GREEN}Running${NC}"
    else
        echo -e "   Client App: ${RED}Not running${NC}"
    fi
}

# Function to setup initial admin
setup_admin() {
    print_header "Setting up Initial Admin User"
    
    cd "$PROJECT_ROOT/api"
    
    if [ ! -f "scripts/setup-admin.js" ]; then
        print_error "Setup script not found. Please ensure the API is properly installed."
        exit 1
    fi
    
    print_status "Running admin setup script..."
    npm run setup-admin
}

# Function to show logs
show_logs() {
    print_header "VTRIA ERP Logs"
    
    cd "$PROJECT_ROOT"
    
    if [ -f "docker-compose.yml" ]; then
        print_status "Showing Docker logs..."
        docker-compose logs -f
    else
        print_warning "No Docker Compose file found. Showing individual process logs..."
        
        # Show API logs if running
        if pgrep -f "node.*server.js" > /dev/null; then
            echo -e "${BLUE}API Server Logs:${NC}"
            # This would need to be implemented based on your logging setup
        fi
    fi
}

# Function to restart everything
restart_all() {
    print_header "Restarting VTRIA ERP System"
    
    stop_all
    sleep 3
    start_default
}

# Function to show help
show_help() {
    echo "VTRIA ERP Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       - Start VTRIA ERP in default mode"
    echo "  start-dev   - Start in development mode (without Docker)"
    echo "  start-prod  - Start in production mode (with Docker)"
    echo "  stop        - Stop all VTRIA ERP processes"
    echo "  restart     - Restart the entire system"
    echo "  status      - Show system status"
    echo "  logs        - Show application logs"
    echo "  setup-admin - Setup initial admin user"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start-dev    # Start in development mode"
    echo "  $0 stop         # Stop everything"
    echo "  $0 status       # Check what's running"
}

# Main execution
main() {
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        print_error "Please run this script from the VTRIA ERP root directory"
        exit 1
    fi
    
    # Check permissions
    check_permissions
    
    # Parse command
    case "${1:-help}" in
        "start")
            start_default
            ;;
        "start-dev"|"dev")
            start_dev
            ;;
        "start-prod"|"prod")
            start_prod
            ;;
        "stop")
            stop_all
            ;;
        "restart")
            restart_all
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "setup-admin"|"setup")
            setup_admin
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
