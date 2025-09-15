#!/bin/bash

# VTRIA ERP Development Startup Script
# This script handles port cleanup and starts both API and client servers

echo "🚀 Starting VTRIA ERP Development Environment"
echo "============================================="

# Function to kill processes on specific ports
cleanup_ports() {
    local ports=("3000" "3001" "3002" "3003" "3004" "3005" "5000")
    
    echo "🧹 Cleaning up potentially occupied ports..."
    
    for port in "${ports[@]}"; do
        local pid=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pid" ]; then
            echo "   Killing process $pid on port $port"
            kill -9 $pid 2>/dev/null || true
        fi
    done
    
    # Wait a moment for ports to be released
    sleep 2
    echo "✓ Port cleanup completed"
}

# Function to start API server
start_api() {
    echo ""
    echo "📡 Starting API Server..."
    cd api
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "   Installing API dependencies..."
        npm install
    fi
    
    # Start the server
    npm run dev &
    API_PID=$!
    echo "   API server started with PID: $API_PID"
    
    cd ..
}

# Function to start client
start_client() {
    echo ""
    echo "🌐 Starting Client Application..."
    cd client
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "   Installing client dependencies..."
        npm install
    fi
    
    # Wait for API to be ready
    echo "   Waiting for API server to be ready..."
    sleep 5
    
    # Start the client
    npm start &
    CLIENT_PID=$!
    echo "   Client application started with PID: $CLIENT_PID"
    
    cd ..
}

# Function to setup environment
setup_env() {
    echo ""
    echo "🔧 Setting up environment..."
    
    # Create client .env if it doesn't exist
    if [ ! -f "client/.env" ]; then
        cat > client/.env << EOL
REACT_APP_API_URL=http://localhost:3001
GENERATE_SOURCEMAP=false
SKIP_PREFLIGHT_CHECK=true
EOL
        echo "   Created client/.env file"
    fi
    
    # Ensure API .env exists
    if [ ! -f "api/.env" ]; then
        echo "⚠️  API .env file not found. Please ensure it exists before continuing."
        exit 1
    fi
    
    echo "✓ Environment setup completed"
}

# Function to show status
show_status() {
    echo ""
    echo "🎯 Development Environment Status"
    echo "================================="
    echo "📡 API Server: http://localhost:3001"
    echo "🌐 Client App: http://localhost:3000"
    echo "📚 API Docs: http://localhost:3001/api-docs"
    echo "🏥 Health Check: http://localhost:3001/health"
    echo ""
    echo "Press Ctrl+C to stop all servers"
}

# Cleanup function for graceful shutdown
cleanup_on_exit() {
    echo ""
    echo "🛑 Shutting down development environment..."
    
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
        echo "   Stopped API server (PID: $API_PID)"
    fi
    
    if [ ! -z "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null || true
        echo "   Stopped client application (PID: $CLIENT_PID)"
    fi
    
    # Final port cleanup
    cleanup_ports
    
    echo "✓ Shutdown completed"
    exit 0
}

# Set trap for cleanup on exit
trap cleanup_on_exit SIGINT SIGTERM

# Main execution
main() {
    # Check if we're in the right directory
    if [ ! -f "package.json" ] && [ ! -d "api" ] && [ ! -d "client" ]; then
        echo "❌ Please run this script from the VTRIA ERP root directory"
        exit 1
    fi
    
    # Perform initial cleanup
    cleanup_ports
    
    # Setup environment
    setup_env
    
    # Start servers
    start_api
    start_client
    
    # Show status
    show_status
    
    # Wait for processes
    wait
}

# Run main function
main