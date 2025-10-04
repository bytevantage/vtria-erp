#!/bin/bash
# Create production deployment package without Git dependency

echo "📦 Creating VTRIA ERP Deployment Package..."

# Get current date for versioning
PACKAGE_DATE=$(date +"%Y%m%d-%H%M")
PACKAGE_NAME="vtria-erp-deployment-${PACKAGE_DATE}"

# Create temporary directory
mkdir -p "temp_package/${PACKAGE_NAME}"

echo "📁 Copying application files..."

# Copy essential files and directories
cp -r api "temp_package/${PACKAGE_NAME}/"
cp -r client "temp_package/${PACKAGE_NAME}/"
cp -r sql "temp_package/${PACKAGE_NAME}/"
cp -r scripts "temp_package/${PACKAGE_NAME}/"

# Copy configuration files
cp docker-compose.windows.yml "temp_package/${PACKAGE_NAME}/"
cp docker-compose.production.yml "temp_package/${PACKAGE_NAME}/"
cp .env.example "temp_package/${PACKAGE_NAME}/"

# Copy deployment scripts
cp deploy-windows.ps1 "temp_package/${PACKAGE_NAME}/"
cp deploy-windows.bat "temp_package/${PACKAGE_NAME}/"
cp enhanced-safe-update.ps1 "temp_package/${PACKAGE_NAME}/"
cp enhanced-safe-update.bat "temp_package/${PACKAGE_NAME}/"
cp start-windows.bat "temp_package/${PACKAGE_NAME}/"

# Copy documentation
cp README.md "temp_package/${PACKAGE_NAME}/"
cp WINDOWS_DEPLOYMENT.md "temp_package/${PACKAGE_NAME}/"
cp DATA_PERSISTENCE_ANALYSIS.md "temp_package/${PACKAGE_NAME}/"
cp SIMPLE_DEPLOYMENT_NO_GIT.md "temp_package/${PACKAGE_NAME}/"

# Copy essential SQL scripts
cp *.sql "temp_package/${PACKAGE_NAME}/" 2>/dev/null || true

# Create deployment instructions
cat > "temp_package/${PACKAGE_NAME}/DEPLOY_INSTRUCTIONS.md" << 'EOF'
# 🚀 VTRIA ERP Windows Deployment

## Quick Start (5 minutes):

1. **Extract this package** to `C:\vtria-erp`
2. **Copy environment file**: `copy .env.example .env.production`
3. **Edit .env.production** with your database credentials
4. **Run deployment**: `deploy-windows.bat`
5. **Access system**: http://localhost:3000

## Detailed Instructions:

### Prerequisites:
- Windows 10/11 or Windows Server 2019+
- Docker Desktop for Windows
- PowerShell 5.0+

### Step-by-Step:

1. **Extract Files:**
   ```
   Extract vtria-erp-deployment.zip to C:\vtria-erp
   ```

2. **Configure Environment:**
   ```batch
   cd C:\vtria-erp
   copy .env.example .env.production
   notepad .env.production
   ```
   
   Edit these settings:
   ```
   DB_PASSWORD=YourSecurePassword123!
   JWT_SECRET=YourJWTSecret256BitKey
   COMPANY_NAME=Your Company Name
   ```

3. **Deploy:**
   ```batch
   deploy-windows.bat
   ```

4. **Access System:**
   - Frontend: http://localhost:3000
   - API: http://localhost:5000
   - Default login: admin/admin (change immediately)

### For Updates:
```batch
enhanced-safe-update.bat
```
This preserves all your data while updating the application.

### Troubleshooting:
- **Port conflicts:** Change ports in docker-compose.windows.yml
- **Database issues:** Check Docker Desktop is running
- **Permission errors:** Run PowerShell as Administrator

### Support:
- Check WINDOWS_DEPLOYMENT.md for detailed guide
- Check DATA_PERSISTENCE_ANALYSIS.md for data safety info
EOF

# Clean up node_modules and logs from api directory
echo "🧹 Cleaning unnecessary files..."
find "temp_package/${PACKAGE_NAME}/api" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find "temp_package/${PACKAGE_NAME}/api" -name "logs" -type d -exec rm -rf {} + 2>/dev/null || true
find "temp_package/${PACKAGE_NAME}/api" -name "uploads" -type d -exec rm -rf {} + 2>/dev/null || true

# Clean up client build directory and node_modules  
find "temp_package/${PACKAGE_NAME}/client" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find "temp_package/${PACKAGE_NAME}/client" -name "build" -type d -exec rm -rf {} + 2>/dev/null || true

# Create ZIP package
echo "📦 Creating ZIP package..."
cd temp_package
zip -r "../${PACKAGE_NAME}.zip" "${PACKAGE_NAME}"
cd ..

# Clean up temporary directory
rm -rf temp_package

echo "✅ Package created: ${PACKAGE_NAME}.zip"
echo ""
echo "📋 Package Contents:"
echo "  - Complete VTRIA ERP application"
echo "  - Windows deployment scripts"
echo "  - Docker configuration"
echo "  - Database schema"
echo "  - Deployment instructions"
echo ""
echo "🚀 To deploy on Windows:"
echo "  1. Copy ${PACKAGE_NAME}.zip to Windows server"
echo "  2. Extract to C:\\vtria-erp"  
echo "  3. Run deploy-windows.bat"
echo ""
echo "📊 Package size: $(du -h "${PACKAGE_NAME}.zip" | cut -f1)"