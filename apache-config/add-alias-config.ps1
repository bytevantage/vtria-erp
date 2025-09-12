# Script to add alias configuration to Apache
$httpdConfPath = "C:\wamp64\bin\apache\apache2.4.62.1\conf\httpd.conf"
$aliasConfPath = "C:\wamp64\www\vtria-erp\apache-config\vtria-erp-alias.conf"

# Read the alias configuration
$aliasConfig = Get-Content -Path $aliasConfPath -Raw

# Check if the Include directive already exists
$httpdConf = Get-Content -Path $httpdConfPath
$includeExists = $httpdConf | Select-String -Pattern "Include `"C:/wamp64/www/vtria-erp/apache-config/vtria-erp-alias.conf`"" -Quiet

if (-not $includeExists) {
    # Add the Include directive at the end of httpd.conf
    Add-Content -Path $httpdConfPath -Value "`n# VTRIA ERP Alias Configuration"
    Add-Content -Path $httpdConfPath -Value "Include `"C:/wamp64/www/vtria-erp/apache-config/vtria-erp-alias.conf`""
    
    Write-Host "Alias configuration added to Apache." -ForegroundColor Green
} else {
    Write-Host "Alias configuration already exists in Apache." -ForegroundColor Yellow
}

# Restart Apache
Write-Host "Restarting Apache..." -ForegroundColor Yellow
Restart-Service -Name "wampapache64"
Write-Host "Apache restarted successfully." -ForegroundColor Green
