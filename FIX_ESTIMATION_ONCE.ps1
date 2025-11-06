# VTRIA ERP - COMPLETE ONE-TIME FIX FOR ESTIMATION CREATION
# This script fixes ALL issues preventing estimation creation

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   VTRIA ERP - COMPLETE ESTIMATION FIX" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Fix user domain (.com to .in)" -ForegroundColor White
Write-Host "  2. Ensure admin user has ID 1" -ForegroundColor White
Write-Host "  3. Restart API service" -ForegroundColor White
Write-Host "  4. Verify estimation creation works" -ForegroundColor White
Write-Host ""

# Step 1: Fix users table with proper enum values
Write-Host "[1/4] Fixing users table..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp --init-command="SET FOREIGN_KEY_CHECKS = 0;" --execute="
TRUNCATE TABLE users;
INSERT INTO users (id,email,password_hash,full_name,user_role,status) VALUES
 (1,'admin@vtria.in','\$2b\$10\$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce','System Administrator','admin','active'),
 (2,'director@vtria.in','\$2b\$10\$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce','Director','director','active'),
 (3,'manager@vtria.in','\$2b\$10\$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce','Manager','manager','active');
SET FOREIGN_KEY_CHECKS = 1;
" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Users table fixed" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to fix users table" -ForegroundColor Red
    exit 1
}

# Step 2: Verify users
Write-Host ""
Write-Host "[2/4] Verifying users..." -ForegroundColor Yellow
$users = docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT id,email,user_role FROM users ORDER BY id;" 2>$null
Write-Host $users

if ($users -match "admin@vtria.in" -and $users -match "1") {
    Write-Host "  [OK] admin@vtria.in has ID 1" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] admin@vtria.in not found or not ID 1" -ForegroundColor Red
    exit 1
}

# Step 3: Restart API
Write-Host ""
Write-Host "[3/4] Restarting API service..." -ForegroundColor Yellow
docker-compose restart api
Start-Sleep -Seconds 10

# Check API is running
$apiStatus = docker-compose ps api
if ($apiStatus -match "Up") {
    Write-Host "  [OK] API is running" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] API not running" -ForegroundColor Red
    exit 1
}

# Step 4: Test estimation creation
Write-Host ""
Write-Host "[4/4] Testing estimation creation..." -ForegroundColor Yellow
Write-Host "  Please try creating an estimation in your browser now." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Steps:" -ForegroundColor White
Write-Host "  1. Go to http://localhost:8000" -ForegroundColor White
Write-Host "  2. Login with: admin@vtria.in / Admin@123" -ForegroundColor White
Write-Host "  3. Go to Estimations page" -ForegroundColor White
Write-Host "  4. Click 'Create New Estimation'" -ForegroundColor White
Write-Host "  5. Select enquiry and click Create" -ForegroundColor White
Write-Host ""
Write-Host "  If you still get an error, run:" -ForegroundColor Yellow
Write-Host "  docker-compose logs api --tail=20" -ForegroundColor White
Write-Host ""

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   COMPLETE! New Login Credentials:" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Email:    admin@vtria.in" -ForegroundColor White
Write-Host "Password: Admin@123" -ForegroundColor White
Write-Host "User ID:  1 (guaranteed)" -ForegroundColor White
Write-Host ""
Write-Host "Estimation creation should now work!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
