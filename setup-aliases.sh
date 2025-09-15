#!/bin/bash

# VTRIA ERP Development Aliases Setup
# Run this once: source ./setup-aliases.sh

echo "🔧 Setting up VTRIA ERP development aliases..."

# Add aliases to current session
alias vtria-start='cd /Users/srbhandary/Documents/Projects/vtria-erp && ./cleanup-and-start.sh'
alias vtria-clean='cd /Users/srbhandary/Documents/Projects/vtria-erp && ./cleanup-ports.sh'
alias vtria-kill='lsof -ti :3000,3001 | xargs kill -9 2>/dev/null || true'

echo "✅ Aliases set for current session:"
echo "   vtria-start  - Clean launch VTRIA ERP"
echo "   vtria-clean  - Clean ports only"  
echo "   vtria-kill   - Quick kill ports"
echo ""
echo "🔧 To make permanent, add these to your ~/.bashrc or ~/.zshrc:"
echo ""
echo "alias vtria-start='cd /Users/srbhandary/Documents/Projects/vtria-erp && ./cleanup-and-start.sh'"
echo "alias vtria-clean='cd /Users/srbhandary/Documents/Projects/vtria-erp && ./cleanup-ports.sh'"
echo "alias vtria-kill='lsof -ti :3000,3001 | xargs kill -9 2>/dev/null || true'"