# Script to enable Apache proxy modules
$httpdConfPath = "C:\wamp64\bin\apache\apache2.4.62.1\conf\httpd.conf"

# Read the current httpd.conf content
$content = Get-Content -Path $httpdConfPath

# Enable proxy modules by uncommenting them
$content = $content -replace '#LoadModule proxy_module modules/mod_proxy.so', 'LoadModule proxy_module modules/mod_proxy.so'
$content = $content -replace '#LoadModule proxy_http_module modules/mod_proxy_http.so', 'LoadModule proxy_http_module modules/mod_proxy_http.so'

# Write the modified content back to httpd.conf
$content | Set-Content -Path $httpdConfPath

Write-Host "Apache proxy modules enabled successfully." -ForegroundColor Green
Write-Host "Restarting Apache..." -ForegroundColor Yellow

# Restart Apache
Restart-Service -Name "wampapache64"

Write-Host "Apache restarted successfully." -ForegroundColor Green
