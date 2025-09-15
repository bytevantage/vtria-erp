#!/bin/bash

# VTRIA ERP Port Cleanup and Launch Script
# This script ensures clean startup by killing any processes on required ports

echo "🔧 VTRIA ERP - Port Cleanup and Launch Script"
echo "=============================================="

# Function to kill processes on a specific port
kill_port_processes() {
    local port=$1
    local port_name=$2
    
    echo "🔍 Checking for processes on port $port ($port_name)..."
    
    # Find PIDs using the port
    local pids=$(lsof -ti :$port)
    
    if [ -z "$pids" ]; then
        echo "✅ Port $port is free"
        return 0
    fi
    
    echo "⚠️  Found processes using port $port: $pids"
    
    # Try graceful shutdown first (SIGTERM)
    echo "🛑 Attempting graceful shutdown..."
    for pid in $pids; do
        if kill -TERM $pid 2>/dev/null; then
            echo "   Sent SIGTERM to PID $pid"
        fi
    done
    
    # Wait a moment for graceful shutdown
    sleep 2
    
    # Check if processes are still running
    local remaining_pids=$(lsof -ti :$port)
    
    if [ ! -z "$remaining_pids" ]; then
        echo "🔪 Force killing remaining processes..."
        for pid in $remaining_pids; do
            if kill -9 $pid 2>/dev/null; then
                echo "   Force killed PID $pid"
            fi
        done
        sleep 1
    fi
    
    # Final check
    local final_check=$(lsof -ti :$port)
    if [ -z "$final_check" ]; then
        echo "✅ Port $port is now free"
    else
        echo "❌ Failed to free port $port"
        return 1
    fi
}

# Function to wait for port to be available
wait_for_port_free() {
    local port=$1
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if ! lsof -i :$port > /dev/null 2>&1; then
            return 0
        fi
        attempt=$((attempt + 1))
        echo "   Waiting for port $port to be free... (attempt $attempt/$max_attempts)"
        sleep 1
    done
    
    echo "❌ Timeout waiting for port $port to be free"
    return 1
}

# Kill processes on our required ports
echo ""
echo "🧹 Cleaning up ports..."
kill_port_processes 3000 "React Client"
kill_port_processes 3001 "API Server"

# Additional cleanup for any node processes that might be hanging
echo ""
echo "🔍 Checking for any hanging VTRIA ERP node processes..."
hanging_pids=$(ps aux | grep -E "(server-minimal|npm start|react-scripts)" | grep -v grep | awk '{print $2}')

if [ ! -z "$hanging_pids" ]; then
    echo "⚠️  Found hanging VTRIA ERP processes: $hanging_pids"
    for pid in $hanging_pids; do
        echo "🔪 Killing hanging process PID $pid"
        kill -9 $pid 2>/dev/null || true
    done
    sleep 1
fi

echo ""
echo "✅ Port cleanup completed!"

# Verify ports are free
echo ""
echo "🔍 Final port verification..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "❌ Port 3000 still in use!"
    lsof -i :3000
    exit 1
fi

if lsof -i :3001 > /dev/null 2>&1; then
    echo "❌ Port 3001 still in use!"
    lsof -i :3001
    exit 1
fi

echo "✅ All ports are free and ready!"

# Launch the application
echo ""
echo "🚀 Launching VTRIA ERP Application..."
echo "====================================="

# Start API Server in background
echo "🖥️  Starting API Server on port 3001..."
cd "$(dirname "$0")/api" || exit 1

# Start the API server
node server-minimal.js &
API_PID=$!
echo "   API Server started with PID: $API_PID"

# Wait for API server to be ready
echo "⏳ Waiting for API server to be ready..."
sleep 3

# Verify API server started successfully
if ! kill -0 $API_PID 2>/dev/null; then
    echo "❌ API Server failed to start!"
    exit 1
fi

if ! lsof -i :3001 > /dev/null 2>&1; then
    echo "❌ API Server not listening on port 3001!"
    exit 1
fi

echo "✅ API Server is running on port 3001"

# Start React Client
echo ""
echo "⚛️  Starting React Client on port 3000..."
cd ../client || exit 1

# Start React client in background
BROWSER=none npm start &
CLIENT_PID=$!
echo "   React Client started with PID: $CLIENT_PID"

# Wait for React client to be ready
echo "⏳ Waiting for React client to be ready..."
for i in {1..30}; do
    if lsof -i :3000 > /dev/null 2>&1; then
        echo "✅ React Client is running on port 3000"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ React Client failed to start within 30 seconds!"
        kill $API_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo ""
echo "🎉 VTRIA ERP Application Started Successfully!"
echo "============================================="
echo "📊 API Server:    http://localhost:3001"
echo "🌐 React Client:  http://localhost:3000"
echo ""
echo "Process IDs:"
echo "   API Server PID:  $API_PID"
echo "   React Client PID: $CLIENT_PID"
echo ""
echo "📝 To stop the application, run:"
echo "   kill $API_PID $CLIENT_PID"
echo ""
echo "🔧 To restart cleanly, run this script again:"
echo "   ./cleanup-and-start.sh"
echo ""
echo "✨ Your Production Management module is now accessible!"
echo "   Navigate to: Manufacturing → Production Management"