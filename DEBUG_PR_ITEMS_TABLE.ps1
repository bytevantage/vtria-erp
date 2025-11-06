# Debug Purchase Requisition Items Table

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   DEBUGGING PURCHASE REQUISITION ITEMS TABLE" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Check what's in purchase_requisition_items table..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
SELECT 
    id,
    pr_id,
    product_id,
    item_name,
    quantity,
    estimated_price,
    notes
FROM purchase_requisition_items
ORDER BY id;
"
Write-Host ""

Write-Host "[2] Check if item_name field exists in this table..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
DESCRIBE purchase_requisition_items;
"
Write-Host ""

Write-Host "[3] Check which PR was created..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
SELECT 
    id,
    pr_number,
    quotation_id,
    status,
    created_at
FROM purchase_requisitions
ORDER BY id DESC
LIMIT 5;
"
Write-Host ""

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   DEBUG COMPLETE" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
