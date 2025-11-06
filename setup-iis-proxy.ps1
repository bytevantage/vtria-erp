# Setup IIS Reverse Proxy for VTRIA ERP
# This will make VTRIA accessible at http://localhost/vtria-erp/

Write-Host "VTRIA ERP - IIS Reverse Proxy Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    Exit 1
}

# Check if IIS is installed
$iisInstalled = Get-WindowsFeature -Name Web-Server
if (-not $iisInstalled.Installed) {
    Write-Host "Installing IIS..." -ForegroundColor Yellow
    Install-WindowsFeature -Name Web-Server -IncludeManagementTools
    Write-Host "✅ IIS installed" -ForegroundColor Green
} else {
    Write-Host "✅ IIS already installed" -ForegroundColor Green
}

# Install required IIS features
Write-Host "Installing IIS features..." -ForegroundColor Yellow
Install-WindowsFeature -Name Web-Default-Doc, Web-Http-Redirect, Web-Static-Content, Web-Http-Logging, Web-Custom-Logging, Web-Filtering, Web-Net-Ext, Web-App-Dev, Web-Asp-Net45, Web-ISAPI-Ext, Web-ISAPI-Filter, Web-Mgmt-Console, Web-Mgmt-Compat, Web-Metabase, Web-Lgcy-Mgmt-Console, Web-Lgcy-Scripting, Web-WMI, Web-Scripting-Tools, Web-Mgmt-Service, Web-Dyn-Compression, Web-Basic-Auth, Web-Windows-Auth, Web-Digest-Auth, Web-Client-Auth, Web-Cert-Auth, Web-Url-Auth, Web-IP-Security, Web-Url-Auth | Out-Null

# Install URL Rewrite Module if not present
if (-not (Test-Path "C:\Windows\System32\inetsrv\rewrite.dll")) {
    Write-Host "Installing URL Rewrite Module..." -ForegroundColor Yellow
    $urlRewriteUrl = "https://download.microsoft.com/download/C/9/E/C9E8180D-4E51-40A6-A9BF-776990D8BCA9/rewrite_2.1_rtw_x64.msi"
    $installerPath = "$env:TEMP\rewrite_2.1_rtw_x64.msi"
    Invoke-WebRequest -Uri $urlRewriteUrl -OutFile $installerPath
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $installerPath, "/quiet" -Wait
    Remove-Item $installerPath -Force
    Write-Host "✅ URL Rewrite Module installed" -ForegroundColor Green
}

# Create VTRIA ERP website
$siteName = "VTRIA ERP"
$physicalPath = "C:\inetpub\vtria-erp"
$appPoolName = "VTRIAPool"

if (-not (Test-Path $physicalPath)) {
    New-Item -ItemType Directory -Path $physicalPath -Force
    Write-Host "✅ Created physical directory: $physicalPath" -ForegroundColor Green
}

# Create application pool
if (-not (Get-WebAppPoolState -Name $appPoolName -ErrorAction SilentlyContinue)) {
    New-WebAppPool -Name $appPoolName
    Set-WebAppPoolState -Name $appPoolName -Value Started
    Write-Host "✅ Created application pool: $appPoolName" -ForegroundColor Green
}

# Create website
if (-not (Get-Website -Name $siteName -ErrorAction SilentlyContinue)) {
    New-Website -Name $siteName -Port 80 -PhysicalPath $physicalPath -ApplicationPool $appPoolName
    Write-Host "✅ Created website: $siteName" -ForegroundColor Green
}

# Create web.config for reverse proxy
Write-Host "Creating reverse proxy configuration..." -ForegroundColor Yellow

$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="VTRIA Reverse Proxy" stopProcessing="true">
          <match url="^vtria-erp/(.*)" />
          <action type="Rewrite" url="http://localhost:8080/{R:1}" />
        </rule>
        <rule name="VTRIA Root Redirect" stopProcessing="true">
          <match url="^vtria-erp$" />
          <action type="Rewrite" url="http://localhost:8080/" />
        </rule>
      </rules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <add name="X-Forwarded-Proto" value="http" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
"@

$webConfig | Out-File -FilePath "$physicalPath\web.config" -Encoding utf8
Write-Host "✅ Created web.config with reverse proxy rules" -ForegroundColor Green

# Restart IIS
Write-Host "Restarting IIS..." -ForegroundColor Yellow
iisreset
Write-Host "✅ IIS restarted" -ForegroundColor Green

Write-Host "`n🎉 IIS Reverse Proxy setup completed!" -ForegroundColor Green
Write-Host "`nYou can now access VTRIA ERP at:" -ForegroundColor Cyan
Write-Host "🌐 http://localhost/vtria-erp/" -ForegroundColor Cyan
Write-Host "`nDemo credentials:" -ForegroundColor White
Write-Host "📧 Email: demo@vtria.com" -ForegroundColor White
Write-Host "🔑 Password: Demo@123456" -ForegroundColor White
Write-Host "`nNote: Make sure your Docker containers are running with 'docker-compose up -d'" -ForegroundColor Yellow
