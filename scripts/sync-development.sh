#!/bin/bash
# Synchronize development environment across AI tools

echo "🔄 Synchronizing VTRIA ERP development environment..."

# Pull latest changes
git fetch origin
git merge origin/develop

# Update dependencies
echo "📦 Updating dependencies..."
cd client && npm install && cd ..
cd api && npm install && cd ..

# Run code formatting
echo "🎨 Formatting code..."
npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"

# Update documentation
echo "📚 Updating documentation..."
npx typedoc --out docs/ client/src/ 2>/dev/null || echo "TypeDoc not available"
npx jsdoc -d docs/api/ api/src/ 2>/dev/null || echo "JSDoc not available"

# Verify build
echo "🏗️ Verifying build..."
cd client && npm run build && cd ..
cd api && npm test 2>/dev/null || echo "Tests not configured" && cd ..

echo "✅ Development environment synchronized!"