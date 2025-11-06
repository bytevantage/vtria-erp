# Debug Purchase Requisition Items Issue

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   DEBUGGING PR ITEMS - Headers vs Actual Parts" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Checking quotation items..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
SELECT 
    id,
    quotation_id,
    item_name,
    description,
    quantity,
    unit,
    rate,
    amount
FROM quotation_items
WHERE quotation_id = 2
ORDER BY id;
"
Write-Host ""

Write-Host "[2] Checking if there's an is_header or item_type field..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
DESCRIBE quotation_items;
"
Write-Host ""

Write-Host "[3] Checking inventory stock for items..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
SELECT 
    item_id,
    item_name,
    available_stock,
    reserved_stock,
    warehouse_location
FROM inventory_warehouse_stock
LIMIT 10;
"
Write-Host ""

Write-Host "[4] Checking products table..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
SELECT 
    id,
    name,
    description
FROM products
WHERE name IN ('hmi', 'wire', 'Incoming', 'Outgoing')
LIMIT 10;
"
Write-Host ""

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   DEBUG COMPLETE" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
