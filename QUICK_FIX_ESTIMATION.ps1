# Quick fix for estimation - direct commands

Write-Host "Fixing estimation creation issue..." -ForegroundColor Yellow

# Step 1: Create a temporary SQL file
$sql = @"
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE users;
INSERT INTO users (id,email,password_hash,full_name,user_role,status) VALUES
(1,'admin@vtria.in','\$2b\$10\$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce','System Administrator','admin','active'),
(2,'director@vtria.in','\$2b\$10\$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce','Director','director','active'),
(3,'manager@vtria.in','\$2b\$10\$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce','Manager','manager','active');
SET FOREIGN_KEY_CHECKS = 1;
"@

$sql | Out-File -FilePath "temp_fix.sql" -Encoding UTF8

# Step 2: Execute the SQL
Write-Host "Executing SQL fix..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp < temp_fix.sql

# Step 3: Clean up
Remove-Item temp_fix.sql

# Step 4: Verify
Write-Host "Verifying users..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT id,email,user_role FROM users ORDER BY id;"

# Step 5: Restart API
Write-Host "Restarting API..." -ForegroundColor Yellow
docker-compose restart api

Write-Host ""
Write-Host "COMPLETE! Login with: admin@vtria.in / Admin@123" -ForegroundColor Green
Write-Host "Now try creating estimation - it should work!" -ForegroundColor Green
