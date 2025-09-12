# VTRIA ERP Automated Installation Script
# This script automates the deployment of VTRIA ERP on WAMP server

# Configuration
$wampPath = "C:\wamp64"
$projectPath = "C:\wamp64\www\vtria-erp"

# Auto-detect Apache version
$apacheVersions = Get-ChildItem "$wampPath\bin\apache" | Where-Object { $_.Name -like "apache*" -and $_.PSIsContainer }
if ($apacheVersions.Count -eq 0) {
    Write-Host "No Apache installation found in WAMP." -ForegroundColor Red
    exit 1
}
$apacheVersion = $apacheVersions[0].Name
$apacheConfPath = "$wampPath\bin\apache\$apacheVersion\conf\httpd.conf"
$apacheExtraConfPath = "$wampPath\bin\apache\$apacheVersion\conf\extra\httpd-vhosts.conf"

Write-Host "Detected Apache version: $apacheVersion" -ForegroundColor Yellow

Write-Host "=== VTRIA ERP Automated Installation ===" -ForegroundColor Cyan
Write-Host "This script will automate the deployment of VTRIA ERP on your WAMP server." -ForegroundColor Yellow

# Step 1: Check if WAMP is running
Write-Host "`n[1/7] Checking WAMP server status..." -ForegroundColor Green
$wampProcess = Get-Process -Name "wampmanager" -ErrorAction SilentlyContinue
if ($null -eq $wampProcess) {
    Write-Host "WAMP is not running. Starting WAMP..." -ForegroundColor Yellow
    Start-Process "$wampPath\wampmanager.exe"
    Start-Sleep -Seconds 10
} else {
    Write-Host "WAMP is already running." -ForegroundColor Green
}

# Step 2: Build React frontend
Write-Host "`n[2/7] Building React frontend..." -ForegroundColor Green
Set-Location "$projectPath\client"
npm install
$env:PUBLIC_URL = "/vtria-erp"
npm run build
if (-not (Test-Path "$projectPath\client\build")) {
    Write-Host "Failed to build React frontend. Please check for errors." -ForegroundColor Red
    exit 1
}
Write-Host "React frontend built successfully." -ForegroundColor Green

# Step 3: Install server dependencies
Write-Host "`n[3/7] Installing server dependencies..." -ForegroundColor Green
Set-Location "$projectPath\server"
npm install
Write-Host "Server dependencies installed successfully." -ForegroundColor Green

# Step 4: Configure Apache
Write-Host "`n[4/7] Configuring Apache..." -ForegroundColor Green

# Add Apache configuration from httpd.conf.additions
$httpdAdditions = Get-Content "$projectPath\apache-config\httpd.conf.additions"
$httpdConf = Get-Content $apacheConfPath

# Check if configuration already exists
$configExists = $httpdConf | Select-String -Pattern "# VTRIA ERP Configuration" -Quiet
if (-not $configExists) {
    Write-Host "Adding VTRIA ERP configuration to Apache..." -ForegroundColor Yellow
    Add-Content -Path $apacheConfPath -Value "`n# VTRIA ERP Configuration"
    Add-Content -Path $apacheConfPath -Value $httpdAdditions
    
    # Add virtual host configuration
    $vhostConfig = @"

<VirtualHost *:80>
    ServerName localhost
    DocumentRoot "$wampPath/www/vtria-erp/client/build"
    
    <Directory "$wampPath/www/vtria-erp/client/build">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api
</VirtualHost>
"@
    
    Add-Content -Path $apacheExtraConfPath -Value $vhostConfig
    
    Write-Host "Apache configuration added successfully." -ForegroundColor Green
} else {
    Write-Host "Apache configuration already exists." -ForegroundColor Green
}

# Step 5: Copy build files to Apache htdocs
Write-Host "`n[5/7] Copying build files to Apache htdocs..." -ForegroundColor Green
if (Test-Path "$wampPath\www\vtria-erp\client\build") {
    # Create directory if it doesn't exist
    if (-not (Test-Path "$wampPath\www\vtria-erp")) {
        New-Item -Path "$wampPath\www\vtria-erp" -ItemType Directory
    }
    
    # Copy build files
    Copy-Item -Path "$projectPath\client\build\*" -Destination "$wampPath\www\vtria-erp" -Recurse -Force
    Write-Host "Build files copied successfully." -ForegroundColor Green
} else {
    Write-Host "Build directory not found. Please build the React frontend first." -ForegroundColor Red
    exit 1
}

# Step 6: Restart Apache
Write-Host "`n[6/7] Restarting Apache..." -ForegroundColor Green
$apacheService = Get-Service -Name "wampapache64" -ErrorAction SilentlyContinue
if ($null -ne $apacheService) {
    Restart-Service -Name "wampapache64"
    Write-Host "Apache restarted successfully." -ForegroundColor Green
} else {
    Write-Host "Apache service not found. Please restart Apache manually." -ForegroundColor Yellow
}

# Step 7: Start Node.js server
Write-Host "`n[7/7] Starting Node.js server..." -ForegroundColor Green
Set-Location "$projectPath\server"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run wamp"
Write-Host "Node.js server started successfully." -ForegroundColor Green

Write-Host "`n=== Installation Complete! ===" -ForegroundColor Cyan
Write-Host "VTRIA ERP is now accessible at: http://localhost/vtria-erp" -ForegroundColor Yellow
Write-Host "Default login credentials:" -ForegroundColor Yellow
Write-Host "Email: admin@vtria.com" -ForegroundColor Yellow
Write-Host "Password: VtriaAdmin@2024" -ForegroundColor Yellow
Write-Host "`nTo make the application accessible remotely:" -ForegroundColor Magenta
Write-Host "1. Configure your network to expose port 80 to the internet" -ForegroundColor Magenta
Write-Host "2. Set up proper DNS records pointing to your public IP" -ForegroundColor Magenta
Write-Host "3. Consider setting up HTTPS for secure remote access" -ForegroundColor Magenta
