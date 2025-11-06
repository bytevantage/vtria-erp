# VTRIA ERP - Check API Error Logs
# Run this on your Windows computer to diagnose the estimation creation error

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   Checking API Logs for Estimation Creation Error" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Checking API container status..." -ForegroundColor Yellow
docker-compose ps api

Write-Host ""
Write-Host "[2] Getting last 100 lines of API logs..." -ForegroundColor Yellow
docker-compose logs --tail=100 api

Write-Host ""
Write-Host "[3] Searching for estimation-related errors..." -ForegroundColor Yellow
docker-compose logs api | Select-String -Pattern "estimation|Estimation" -Context 5,5 | Select-Object -Last 20

Write-Host ""
Write-Host "[4] Searching for SQL errors..." -ForegroundColor Yellow
docker-compose logs api | Select-String -Pattern "Error|ERROR|ER_" -Context 2,2 | Select-Object -Last 10

Write-Host ""
Write-Host "[5] Checking database container..." -ForegroundColor Yellow
docker-compose ps db

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Please share the output above" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
