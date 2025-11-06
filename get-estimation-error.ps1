# Get the actual error from the estimation creation attempt

Write-Host "Checking for estimation creation error..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Getting last 200 lines of API logs..." -ForegroundColor Cyan
docker-compose logs --tail=200 api | Select-String -Pattern "POST /api/estimations" -Context 0,30

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "Searching for ERROR messages..." -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
docker-compose logs api | Select-String -Pattern "Error|ERROR|error" | Select-Object -Last 20

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "Searching for SQL errors..." -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
docker-compose logs api | Select-String -Pattern "ER_|SQL|sql" | Select-Object -Last 10

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "Getting full context around POST /api/estimations..." -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
docker-compose logs api | Select-String -Pattern "POST /api/estimations" -Context 2,20 | Select-Object -Last 1
