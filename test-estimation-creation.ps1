# VTRIA ERP - Test Estimation Creation Endpoint
# Run this to diagnose and test estimation creation

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   VTRIA ERP - Estimation Creation Diagnostic & Test" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check all containers are running
Write-Host "[1/7] Checking container status..." -ForegroundColor Yellow
$containers = docker-compose ps
Write-Host $containers
Write-Host ""

# Step 2: Check API logs for recent errors
Write-Host "[2/7] Checking API logs for errors (last 50 lines)..." -ForegroundColor Yellow
docker-compose logs --tail=50 api | Select-String -Pattern "Error|ERROR|error" | Select-Object -Last 10
Write-Host ""

# Step 3: Check database is healthy
Write-Host "[3/7] Checking database health..." -ForegroundColor Yellow
docker-compose exec db mysqladmin ping -u vtria_user -pdev_password
Write-Host ""

# Step 4: Verify tables exist
Write-Host "[4/7] Verifying required tables exist..." -ForegroundColor Yellow
$tables = @('sales_enquiries', 'cases', 'estimations', 'estimation_sections', 'document_sequences')
foreach ($table in $tables) {
    $result = docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "SHOW TABLES LIKE '$table';" 2>$null
    if ($result -match $table) {
        Write-Host "  [OK] $table exists" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $table missing!" -ForegroundColor Red
    }
}
Write-Host ""

# Step 5: Check if sales enquiries exist
Write-Host "[5/7] Checking for existing sales enquiries..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT id, enquiry_id, project_name, case_id FROM sales_enquiries LIMIT 5;"
Write-Host ""

# Step 6: Test API connectivity
Write-Host "[6/7] Testing API connectivity..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue 2>$null
    Write-Host "  [OK] API is responding" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] API not responding: $_" -ForegroundColor Red
}
Write-Host ""

# Step 7: Get detailed API error for estimations endpoint
Write-Host "[7/7] Checking estimation endpoint logs..." -ForegroundColor Yellow
docker-compose logs api | Select-String -Pattern "estimation|createEstimation" -Context 3,3 | Select-Object -Last 15
Write-Host ""

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   TROUBLESHOOTING STEPS" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "If API shows errors, try:" -ForegroundColor Yellow
Write-Host "  1. Restart API: docker-compose restart api" -ForegroundColor White
Write-Host "  2. Check full API logs: docker-compose logs api | Select-String ERROR" -ForegroundColor White
Write-Host "  3. Rebuild API: docker-compose up -d --build api" -ForegroundColor White
Write-Host ""

Write-Host "If database issues, try:" -ForegroundColor Yellow
Write-Host "  1. Check DB logs: docker-compose logs db" -ForegroundColor White
Write-Host "  2. Restart DB: docker-compose restart db" -ForegroundColor White
Write-Host ""

Write-Host "To see real-time API logs while testing:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f api" -ForegroundColor White
Write-Host ""

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Please share any ERROR messages from above" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
