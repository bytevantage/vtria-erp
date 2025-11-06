#!/bin/bash
# Fix all hardcoded API URLs to use relative paths

cd "$(dirname "$0")/client/src"

# Find all JS/JSX/TS/TSX files and replace hardcoded localhost:3001 with empty string
find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak "s|'http://localhost:3001'|''|g" {} \;
find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|"http://localhost:3001"|""|g' {} \;
find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|`http://localhost:3001`|``|g' {} \;

# Remove backup files
find . -type f -name "*.bak" -delete

echo "✅ Fixed all hardcoded API URLs to use relative paths"
echo "Files will now use nginx proxy for API calls"
