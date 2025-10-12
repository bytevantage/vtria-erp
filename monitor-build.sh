#!/bin/bash

# Docker Build Monitor Script
# Checks the Docker build progress every 30 seconds

echo "🔍 Monitoring Docker build progress..."
echo "Log file: /tmp/docker-build.log"
echo ""

while true; do
  # Check if the job is still running
  if jobs | grep -q "docker-compose build"; then
    echo "⏳ Build in progress... ($(date +%H:%M:%S))"
    
    # Show last few lines of log
    echo "Latest output:"
    tail -5 /tmp/docker-build.log | grep -E "^#|npm|done|DONE|Successfully"
    echo ""
    
    # Check for common stages
    if grep -q "npm run build" /tmp/docker-build.log 2>/dev/null; then
      echo "📦 Building React application..."
    elif grep -q "npm ci" /tmp/docker-build.log 2>/dev/null; then
      echo "📥 Installing dependencies..."
    fi
    
    sleep 30
  else
    echo "✅ Build job completed or stopped!"
    echo ""
    echo "Checking Docker images..."
    docker images | grep vtria-erp
    echo ""
    echo "Run 'docker-compose up -d' to start the containers."
    break
  fi
done
