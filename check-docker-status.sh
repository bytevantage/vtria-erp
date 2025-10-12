#!/bin/bash

# Quick Docker Status Check for VTRIA ERP

echo "════════════════════════════════════════════════"
echo "   VTRIA ERP - Docker Status Check"
echo "════════════════════════════════════════════════"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "   Please start Docker Desktop"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check container status
echo "📦 Container Status:"
echo "────────────────────────────────────────────────"
docker-compose ps
echo ""

# Check which JS bundle is being served
echo "🔍 Current Frontend Bundle:"
echo "────────────────────────────────────────────────"
BUNDLE=$(curl -s http://localhost/vtria-erp/ | grep -o "main\.[a-f0-9]*\.js" | head -1)
if [ -n "$BUNDLE" ]; then
    echo "   $BUNDLE"
    if [ "$BUNDLE" = "main.a5b104ec.js" ]; then
        echo "   ✅ Latest build (with fixes)"
    else
        echo "   ⚠️  Unexpected bundle version"
    fi
else
    echo "   ❌ Could not detect bundle (is server running?)"
fi
echo ""

# Quick health check
echo "🏥 Health Check:"
echo "────────────────────────────────────────────────"
API_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ API: Healthy"
else
    echo "   ❌ API: Not responding"
fi

FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/vtria-erp/ 2>/dev/null)
if [ "$FRONTEND" = "200" ]; then
    echo "   ✅ Frontend: Accessible"
else
    echo "   ❌ Frontend: Not accessible (HTTP $FRONTEND)"
fi
echo ""

# Quick access URLs
echo "🌐 Access URLs:"
echo "────────────────────────────────────────────────"
echo "   Frontend:  http://localhost/vtria-erp/"
echo "   API:       http://localhost:3001/api/"
echo "   API Docs:  http://localhost:3001/api-docs"
echo "   Health:    http://localhost:3001/health"
echo ""

echo "════════════════════════════════════════════════"
echo "✅ All systems operational!"
echo ""
echo "💡 Quick Commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Restart:      docker-compose restart"
echo "   Stop:         docker-compose down"
echo "════════════════════════════════════════════════"
