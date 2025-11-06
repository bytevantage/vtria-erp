# VTRIA ERP - Database Container Crash Diagnostic Script
# Run this on your REMOTE Windows computer where the container crashed

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   VTRIA ERP - Database Container Crash Diagnostics" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# Check container status
Write-Host "[1/8] Checking container status..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "[2/8] Getting last 100 lines of database logs..." -ForegroundColor Yellow
docker-compose logs --tail=100 db

Write-Host ""
Write-Host "[3/8] Checking for database crash in logs..." -ForegroundColor Yellow
docker-compose logs db | Select-String -Pattern "error|Error|ERROR|crash|Crash|CRASH|killed|abort" | Select-Object -Last 20

Write-Host ""
Write-Host "[4/8] Checking system resources..." -ForegroundColor Yellow
Write-Host "Memory usage:"
Get-Process | Where-Object {$_.ProcessName -like "*docker*" -or $_.ProcessName -like "*mysql*"} | Select-Object ProcessName, @{Name="Memory(MB)";Expression={[math]::round($_.WorkingSet / 1MB, 2)}} | Format-Table

Write-Host ""
Write-Host "[5/8] Checking Docker disk space..." -ForegroundColor Yellow
docker system df

Write-Host ""
Write-Host "[6/8] Checking if database volume is corrupted..." -ForegroundColor Yellow
docker volume inspect vtria-erp_mysql_data

Write-Host ""
Write-Host "[7/8] Checking database container exit code..." -ForegroundColor Yellow
docker-compose ps -a | Select-String "db"

Write-Host ""
Write-Host "[8/8] Getting detailed container inspect..." -ForegroundColor Yellow
docker inspect vtria-erp-db-1 --format='{{.State.ExitCode}} - {{.State.Error}}'

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   Common Database Crash Causes & Solutions" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "CAUSE 1: Out of Memory (OOM Killer)" -ForegroundColor Red
Write-Host "  Solution: Increase Docker memory limit or reduce MySQL buffer pool"
Write-Host ""

Write-Host "CAUSE 2: Disk Space Full" -ForegroundColor Red
Write-Host "  Solution: Clean up disk space, prune Docker volumes"
Write-Host "  Command: docker system prune -a --volumes"
Write-Host ""

Write-Host "CAUSE 3: Corrupted Database Volume" -ForegroundColor Red
Write-Host "  Solution: Remove and recreate volume (WARNING: loses data)"
Write-Host "  Commands:"
Write-Host "    docker-compose down -v"
Write-Host "    docker-compose up -d"
Write-Host ""

Write-Host "CAUSE 4: MySQL Configuration Issues" -ForegroundColor Red
Write-Host "  Solution: Check MySQL memory settings in docker-compose.yml"
Write-Host ""

Write-Host "CAUSE 5: Too Many Connections" -ForegroundColor Red
Write-Host "  Solution: Increase max_connections or close unused connections"
Write-Host ""

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   Quick Fix Commands" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "TRY THESE IN ORDER:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Restart database container:" -ForegroundColor Yellow
Write-Host "   docker-compose restart db" -ForegroundColor White
Write-Host ""

Write-Host "2. If restart doesn't work, recreate container:" -ForegroundColor Yellow
Write-Host "   docker-compose up -d --force-recreate db" -ForegroundColor White
Write-Host ""

Write-Host "3. If still crashing, check logs and clean up:" -ForegroundColor Yellow
Write-Host "   docker-compose logs db | Select-String -Pattern 'ERROR'" -ForegroundColor White
Write-Host "   docker system prune -f" -ForegroundColor White
Write-Host ""

Write-Host "4. Last resort - fresh database (LOSES DATA):" -ForegroundColor Yellow
Write-Host "   docker-compose down" -ForegroundColor White
Write-Host "   docker volume rm vtria-erp_mysql_data" -ForegroundColor White
Write-Host "   docker-compose up -d" -ForegroundColor White
Write-Host ""

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Please share the output above for detailed analysis" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
