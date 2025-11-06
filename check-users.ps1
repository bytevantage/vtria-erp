# Check what users exist in the database

Write-Host "Checking users in database..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "SELECT id, email, full_name, user_role FROM users ORDER BY id;"
