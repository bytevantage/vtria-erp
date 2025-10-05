#!/bin/bash

# VTRIA ERP Client Development Start Script
# This script provides multiple ways to start the client depending on your needs

echo "🚀 VTRIA ERP Client Startup Options"
echo "=================================="
echo "1. Full TypeScript checking (default)"
echo "2. Skip TypeScript errors (faster development)"
echo "3. Production build and serve"
echo ""

# Check if an argument was passed
if [ "$1" = "fast" ] || [ "$1" = "dev" ]; then
    echo "🏃‍♂️ Starting with fast development mode (skipping TS errors)..."
    SKIP_PREFLIGHT_CHECK=true TSC_COMPILE_ON_ERROR=true npm start
elif [ "$1" = "build" ]; then
    echo "🏗️ Building for production..."
    npm run build
    echo "✅ Build complete! Files are in the 'build' directory"
elif [ "$1" = "serve" ]; then
    echo "🌐 Building and serving production version..."
    npm run build && npx serve -s build -l 3000
else
    echo "🔧 Starting with full TypeScript checking..."
    npm start
fi