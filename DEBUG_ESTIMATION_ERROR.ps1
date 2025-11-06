# Debug estimation creation error step by step

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   DEBUGGING ESTIMATION CREATION ERROR" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Checking what users actually exist..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT id, email, user_role FROM users ORDER BY id;"
Write-Host ""

Write-Host "[2] Checking what user ID the code is trying to use..." -ForegroundColor Yellow
Write-Host "The code runs: SELECT id FROM users ORDER BY id LIMIT 1" -ForegroundColor White
$firstUserId = docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT id FROM users ORDER BY id LIMIT 1;" 2>$null
Write-Host "Result: $firstUserId" -ForegroundColor Green
Write-Host ""

Write-Host "[3] Checking if that user ID actually exists..." -ForegroundColor Yellow
if ($firstUserId -match "(\d+)") {
    $userId = $matches[1]
    Write-Host "User ID being used: $userId" -ForegroundColor White
    $userExists = docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT COUNT(*) as count FROM users WHERE id = $userId;" 2>$null
    Write-Host "User exists check: $userExists" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not extract user ID from query result" -ForegroundColor Red
}
Write-Host ""

Write-Host "[4] Testing the exact INSERT that's failing..." -ForegroundColor Yellow
Write-Host "Let's see what happens when we try to insert with created_by = 1" -ForegroundColor White
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
INSERT INTO estimations (estimation_id, enquiry_id, case_id, date, created_by, status) 
VALUES ('TEST-001', 2, 2, CURDATE(), 1, 'draft');
" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Insert worked with created_by = 1" -ForegroundColor Green
    # Clean up the test record
    docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "DELETE FROM estimations WHERE estimation_id = 'TEST-001';" 2>$null
} else {
    Write-Host "FAILED: Insert failed with created_by = 1" -ForegroundColor Red
}
Write-Host ""

Write-Host "[5] If no users exist, create admin@vtria.in with ID 1..." -ForegroundColor Yellow
$userCount = docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT COUNT(*) as count FROM users;" 2>$null
if ($userCount -match "0") {
    Write-Host "No users found - creating admin@vtria.in with ID 1" -ForegroundColor Red
    docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
    SET FOREIGN_KEY_CHECKS = 0;
    INSERT INTO users (id,email,password_hash,full_name,user_role,status) VALUES
    (1,'admin@vtria.in','\$2b\$10\$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce','System Administrator','admin','active');
    SET FOREIGN_KEY_CHECKS = 1;
    " 2>$null
    Write-Host "User created. Verifying..." -ForegroundColor Yellow
    docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT id,email FROM users WHERE id = 1;" 2>$null
} else {
    Write-Host "Users exist in database" -ForegroundColor Green
}
Write-Host ""

Write-Host "[6] Restart API to ensure it picks up changes..." -ForegroundColor Yellow
docker-compose restart api
Start-Sleep -Seconds 5
Write-Host "API restarted" -ForegroundColor Green
Write-Host ""

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   DEBUG COMPLETE" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now try creating estimation again." -ForegroundColor Green
Write-Host "If it still fails, share the output above." -ForegroundColor Green
Write-Host ""
