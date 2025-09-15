#!/bin/bash

# Simple VTRIA ERP Launch Script
echo "🚀 Starting VTRIA ERP System..."

# Go to project directory
cd "$(dirname "$0")"

# Start database
echo "Starting database..."
docker-compose up -d
sleep 5

# Start backend
echo "Starting backend API..."
cd api
PORT=3001 node src/server.js &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3

# Start frontend
echo "Starting frontend..."
cd ../client
PORT=3003 npm start &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "🎉 VTRIA ERP System is starting!"
echo ""
echo "Access URLs:"
echo "  Frontend: http://localhost:3003"
echo "  Backend:  http://localhost:3001"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"

# Wait and open browser
sleep 20
open http://localhost:3003
