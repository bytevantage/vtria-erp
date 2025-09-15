#!/bin/bash

echo "🧹 VTRIA ERP - Port Cleanup Script"
echo "=================================="

# Kill all VTRIA-related processes
echo "🔄 Stopping all VTRIA ERP processes..."

# Kill React development servers
echo "   ⏹️  Stopping React development servers..."
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "PORT=300[0-9].*npm" 2>/dev/null || true

# Kill Node.js backend servers  
echo "   ⏹️  Stopping Node.js backend servers..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "PORT=3001.*node" 2>/dev/null || true

# Kill any processes using our target ports
echo "   ⏹️  Freeing up target ports (3000, 3001)..."
for port in 3000 3001; do
    pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        echo "      Killing processes on port $port: $pids"
        kill -9 $pids 2>/dev/null || true
    fi
done

# Wait a moment for processes to die
sleep 2

# Verify ports are free
echo "🔍 Verifying ports are free..."
for port in 3000 3001; do
    if lsof -i:$port >/dev/null 2>&1; then
        echo "   ❌ Port $port is still occupied"
        lsof -i:$port
    else
        echo "   ✅ Port $port is free"
    fi
done

echo "✨ Port cleanup completed!"
