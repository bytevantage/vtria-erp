#!/bin/bash

echo "🧹 Cleaning up VTRIA ERP Docker containers..."

# Stop all containers
docker-compose down

# Remove any orphaned containers
docker-compose rm -f

# Prune any dangling networks
docker network prune -f

# Wait a moment for ports to be released
sleep 2

echo "🚀 Starting VTRIA ERP with clean state..."

# Start all services
docker-compose up -d

# Wait for services to start
sleep 5

echo "✅ VTRIA ERP is starting up..."
echo "📊 Frontend: http://localhost:3100"
echo "🔧 API: http://localhost:3001"
echo "💾 Database: localhost:3306"

# Show container status
docker-compose ps
