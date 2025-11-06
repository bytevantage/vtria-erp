# Debug Purchase Requisition - Why quotations not showing

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   DEBUGGING PURCHASE REQUISITION QUOTATIONS ISSUE" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Checking for approved quotations..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
SELECT 
    q.id,
    q.quotation_id,
    q.status,
    e.id as estimation_id,
    se.id as enquiry_id,
    se.project_name
FROM quotations q
JOIN estimations e ON q.estimation_id = e.id
JOIN sales_enquiries se ON e.enquiry_id = se.id
WHERE q.status IN ('approved', 'sent')
ORDER BY q.quotation_id
LIMIT 10;
"
Write-Host ""

Write-Host "[2] Checking if cases exist for these quotations..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
SELECT 
    q.id,
    q.quotation_id,
    q.status,
    se.case_id,
    cases.id as case_exists,
    cases.current_state,
    cases.status as case_status
FROM quotations q
JOIN estimations e ON q.estimation_id = e.id
JOIN sales_enquiries se ON e.enquiry_id = se.id
LEFT JOIN cases ON se.case_id = cases.id
WHERE q.status IN ('approved', 'sent')
ORDER BY q.quotation_id
LIMIT 10;
"
Write-Host ""

Write-Host "[3] Checking if purchase requisitions already exist..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
SELECT 
    q.id,
    q.quotation_id,
    q.status,
    pr.id as pr_exists,
    pr.status as pr_status
FROM quotations q
LEFT JOIN purchase_requisitions pr ON (pr.quotation_id = q.id OR pr.quotation_id = q.quotation_id)
WHERE q.status IN ('approved', 'sent')
ORDER BY q.quotation_id
LIMIT 10;
"
Write-Host ""

Write-Host "[4] Running the exact query from the controller..." -ForegroundColor Yellow
docker-compose exec -T db mysql -u vtria_user -pdev_password vtria_erp -e "
SELECT DISTINCT
    q.id as quotation_id,
    q.quotation_id as quotation_number,
    c.company_name as client_name,
    se.project_name,
    q.status as quotation_status,
    se.case_id,
    cases.case_number
FROM quotations q
JOIN estimations e ON q.estimation_id = e.id
JOIN sales_enquiries se ON e.enquiry_id = se.id
JOIN clients c ON se.client_id = c.id
LEFT JOIN cases ON se.case_id = cases.id
LEFT JOIN purchase_requisitions pr ON (pr.quotation_id = q.id OR pr.quotation_id = q.quotation_id)
    AND pr.status IN ('draft', 'pending_approval', 'approved')
WHERE q.status IN ('approved', 'sent')
AND pr.id IS NULL
AND cases.current_state IN ('quotation', 'order', 'production')
AND cases.status = 'active'
ORDER BY q.quotation_id;
"
Write-Host ""

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   DEBUG COMPLETE" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Share this output to identify why quotations aren't showing." -ForegroundColor Green
Write-Host ""
