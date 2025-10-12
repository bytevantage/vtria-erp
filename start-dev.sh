#!/bin/bash

# VTRIA ERP - Quick Dev Server Start
# Use this for quick testing without Docker rebuild

echo "🚀 Starting VTRIA ERP Development Servers..."
echo ""

# Check if Docker is running
if docker ps &> /dev/null; then
    echo "📦 Stopping Docker containers..."
    docker-compose down
    echo "✅ Docker stopped"
    echo ""
fi

# Start database and redis in Docker
echo "🗄️ Starting Database and Redis..."
docker-compose up -d db redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Start API server in background
echo "🔧 Starting API Server (port 3001)..."
cd api
npm start > ../api.log 2>&1 &
API_PID=$!
echo "✅ API Server started (PID: $API_PID)"
cd ..

# Wait for API to start
sleep 3

# Start React dev server
echo "⚛️ Starting React Dev Server (port 3000)..."
echo ""
echo "======================================"
echo "✅ All servers started!"
echo "======================================"
echo ""
echo "🌐 Frontend: http://localhost:3000/"
echo "🔧 API: http://localhost:3001/api/health"
echo "🗄️ Database: localhost:3306"
echo ""
echo "📋 To view API logs:"
echo "   tail -f api.log"
echo ""
echo "🛑 To stop servers:"
echo "   Press Ctrl+C (stops React)"
echo "   Kill API: kill $API_PID"
echo "   Stop Docker: docker-compose down"
echo ""
echo "======================================"
echo ""

cd client
npm start
