#!/bin/bash

# VTRIA ERP Quick Port Cleanup Script
# Use this to quickly free up ports 3000 and 3001 without restarting

echo "🧹 VTRIA ERP - Quick Port Cleanup"
echo "================================="

# Function to kill processes on a specific port
kill_port_processes() {
    local port=$1
    local port_name=$2
    
    echo "🔍 Checking port $port ($port_name)..."
    
    local pids=$(lsof -ti :$port)
    
    if [ -z "$pids" ]; then
        echo "✅ Port $port is already free"
        return 0
    fi
    
    echo "⚠️  Killing processes on port $port: $pids"
    
    # Force kill immediately for quick cleanup
    for pid in $pids; do
        if kill -9 $pid 2>/dev/null; then
            echo "   ❌ Killed PID $pid"
        fi
    done
    
    sleep 1
    
    # Verify port is free
    local final_check=$(lsof -ti :$port)
    if [ -z "$final_check" ]; then
        echo "✅ Port $port is now free"
    else
        echo "❌ Failed to free port $port"
    fi
}

# Clean up the ports
kill_port_processes 3000 "React Client"
kill_port_processes 3001 "API Server"

# Clean up any hanging VTRIA ERP processes
echo ""
echo "🔍 Cleaning up hanging node processes..."
pkill -f "server-minimal" 2>/dev/null && echo "   ❌ Killed server-minimal processes" || true
pkill -f "react-scripts" 2>/dev/null && echo "   ❌ Killed react-scripts processes" || true

echo ""
echo "✅ Port cleanup completed!"
echo ""
echo "🚀 You can now run:"
echo "   ./cleanup-and-start.sh    # Clean restart both services"
echo "   Or start manually:"
echo "   cd api && node server-minimal.js"
echo "   cd client && npm start"