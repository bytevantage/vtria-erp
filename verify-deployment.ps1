# Verify VTRIA ERP Deployment
# This script checks if all components are properly configured

Write-Host "VTRIA ERP Deployment Verification" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "[ERROR] docker-compose.yml not found. Please run from C:\vtria-erp" -ForegroundColor Red
    Exit 1
}

Write-Host "[OK] Found docker-compose.yml" -ForegroundColor Green

# Check Git status
Write-Host "`nChecking Git status..." -ForegroundColor Yellow
git log --oneline -n 3
Write-Host ""

# Check critical files
Write-Host "Checking critical configuration files..." -ForegroundColor Yellow

# Check docker-compose.yml ports
$dockerConfig = Get-Content "docker-compose.yml"
if ($dockerConfig -match '8000:80') {
    Write-Host "[OK] docker-compose.yml: Using port 8000" -ForegroundColor Green
} else {
    Write-Host "[ERROR] docker-compose.yml: Port 8000 not configured" -ForegroundColor Red
}

# Check client config files
if (Test-Path "client\config-overrides.js") {
    $configOverrides = Get-Content "client\config-overrides.js"
    if ($configOverrides -match 'disableEsLint') {
        Write-Host "[OK] config-overrides.js: ESLint disabled" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] config-overrides.js: ESLint not disabled" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] config-overrides.js not found" -ForegroundColor Red
}

# Check package.json build script
if (Test-Path "client\package.json") {
    $packageJson = Get-Content "client\package.json"
    if ($packageJson -match 'ESLINT_NO_DEV_ERRORS=true') {
        Write-Host "[OK] package.json: Build script configured" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] package.json: Build script not configured" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] package.json not found" -ForegroundColor Red
}

# Check nginx.conf
if (Test-Path "client\nginx.conf") {
    $nginxConfig = Get-Content "client\nginx.conf"
    if ($nginxConfig -match 'try_files /index.html =404' -and $nginxConfig -notmatch 'return 301 /vtria-erp/') {
        Write-Host "[OK] nginx.conf: Root access configured" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] nginx.conf: Root access not configured" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] nginx.conf not found" -ForegroundColor Red
}

# Check Docker containers
Write-Host "`nChecking Docker containers..." -ForegroundColor Yellow
docker-compose ps

# Check if port 8000 is listening
Write-Host "`nChecking port 8000..." -ForegroundColor Yellow
$portCheck = netstat -an | findstr :8000
if ($portCheck) {
    Write-Host "[OK] Port 8000 is listening" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Port 8000 is not listening" -ForegroundColor Red
}

# Test nginx response
Write-Host "`nTesting nginx response..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000" -UseBasicParsing -TimeoutSec 5
    if ($response.Content -match "VTRIA" -or $response.Content -match "nginx") {
        Write-Host "[OK] Server is responding on port 8000" -ForegroundColor Green
        if ($response.Content -match "Welcome to nginx!") {
            Write-Host "[WARNING] Showing nginx welcome page - React build needs fixing" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[ERROR] Unexpected response from server" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Cannot connect to port 8000: $_" -ForegroundColor Red
}

Write-Host "`nDeployment verification completed!" -ForegroundColor Cyan
Write-Host "If all checks pass [OK], try accessing: http://localhost:8000" -ForegroundColor White
