#!/bin/bash

# Enterprise Case Analytics - Diagnostic Tool

echo "════════════════════════════════════════════════"
echo "   Enterprise Case Analytics - Diagnostics"
echo "════════════════════════════════════════════════"
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check container status
echo "📦 Checking Containers..."
echo "────────────────────────────────────────────────"
CLIENT_STATUS=$(docker-compose ps client | grep "Up" | wc -l)
API_STATUS=$(docker-compose ps api | grep "Up" | wc -l)

if [ "$CLIENT_STATUS" -eq 1 ]; then
    echo "   ✅ Client container: Running"
else
    echo "   ❌ Client container: Not running"
fi

if [ "$API_STATUS" -eq 1 ]; then
    echo "   ✅ API container: Running"
else
    echo "   ❌ API container: Not running"
fi
echo ""

# Check which bundle is being served
echo "🔍 Checking JavaScript Bundle..."
echo "────────────────────────────────────────────────"
BUNDLE=$(curl -s http://localhost/vtria-erp/ 2>/dev/null | grep -o "main\.[a-f0-9]*\.js" | head -1)
if [ "$BUNDLE" = "main.a5b104ec.js" ]; then
    echo "   ✅ Serving: $BUNDLE (LATEST - with fixes)"
elif [ "$BUNDLE" = "main.78ac2fb3.js" ]; then
    echo "   ⚠️  Serving: $BUNDLE (OLD - has bugs)"
    echo "   📝 Action: Hard refresh browser (Cmd + Shift + R)"
elif [ -n "$BUNDLE" ]; then
    echo "   ⚠️  Serving: $BUNDLE (UNKNOWN version)"
else
    echo "   ❌ Could not detect bundle (server not responding)"
fi
echo ""

# Check API health
echo "🏥 Checking API Health..."
echo "────────────────────────────────────────────────"
API_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if echo "$API_HEALTH" | grep -q "OK"; then
    echo "   ✅ API: Healthy"
else
    echo "   ❌ API: Not responding"
fi
echo ""

# Check auth endpoint
echo "🔐 Checking Auth Endpoint..."
echo "────────────────────────────────────────────────"
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/auth/me 2>/dev/null)
if [ "$AUTH_RESPONSE" = "401" ]; then
    echo "   ⚠️  /api/auth/me: 401 (Not authenticated - normal if not logged in)"
elif [ "$AUTH_RESPONSE" = "200" ]; then
    echo "   ✅ /api/auth/me: 200 (Authenticated)"
else
    echo "   ❌ /api/auth/me: $AUTH_RESPONSE (Unexpected response)"
fi
echo ""

# Check recent API logs for auth errors
echo "📋 Recent Auth Errors..."
echo "────────────────────────────────────────────────"
AUTH_ERRORS=$(docker-compose logs api --tail=50 2>/dev/null | grep -i "401\|auth.*error\|unauthorized" | wc -l)
if [ "$AUTH_ERRORS" -gt 0 ]; then
    echo "   ⚠️  Found $AUTH_ERRORS authentication errors in recent logs"
    echo ""
    echo "   Last 3 errors:"
    docker-compose logs api --tail=50 2>/dev/null | grep -i "401\|auth.*error\|unauthorized" | tail -3 | sed 's/^/      /'
else
    echo "   ✅ No recent authentication errors"
fi
echo ""

# Check if enterprise case endpoint exists
echo "🎯 Checking Enterprise Case Endpoint..."
echo "────────────────────────────────────────────────"
# Just check if API has the route (without auth)
if docker-compose exec -T api grep -r "enterprise.*analytics" /usr/src/app/src/routes/ > /dev/null 2>&1; then
    echo "   ✅ Enterprise analytics route found in API"
else
    echo "   ⚠️  Could not verify enterprise analytics route"
fi
echo ""

# Summary and recommendations
echo "════════════════════════════════════════════════"
echo "📊 Summary"
echo "════════════════════════════════════════════════"
echo ""

if [ "$BUNDLE" = "main.a5b104ec.js" ] && [ "$CLIENT_STATUS" -eq 1 ] && [ "$API_STATUS" -eq 1 ]; then
    echo "✅ System appears healthy!"
    echo ""
    echo "If you're still being redirected to login:"
    echo "1. Hard refresh browser: Cmd + Shift + R"
    echo "2. Check browser console (F12) for errors"
    echo "3. Verify vtria_token in localStorage"
    echo "4. Try logging in again"
else
    echo "⚠️  Issues detected. Recommended actions:"
    echo ""
    
    if [ "$BUNDLE" = "main.78ac2fb3.js" ]; then
        echo "1. ⭐ HARD REFRESH BROWSER (Cmd + Shift + R)"
        echo "   - You're serving the OLD bundle with bugs"
    fi
    
    if [ "$CLIENT_STATUS" -eq 0 ] || [ "$API_STATUS" -eq 0 ]; then
        echo "2. 🔄 Restart Docker containers:"
        echo "   docker-compose restart"
    fi
fi

echo ""
echo "════════════════════════════════════════════════"
echo "💡 Quick Commands:"
echo "   Hard refresh:  Cmd + Shift + R in browser"
echo "   View logs:     docker-compose logs -f api"
echo "   Restart:       docker-compose restart"
echo "════════════════════════════════════════════════"
