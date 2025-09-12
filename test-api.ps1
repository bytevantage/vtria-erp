Write-Host "===== VTRIA ERP API Test Script =====" -ForegroundColor Cyan
Write-Host "Testing server health endpoint..." -ForegroundColor Yellow

try { 
    $response = Invoke-WebRequest -Uri 'http://localhost:8080/vtria-erp/api/health' -Method GET -ErrorAction Stop
    Write-Host "Health Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Content: $($response.Content)" -ForegroundColor Green
    
    # If health check is successful, proceed to login test
    Write-Host "Testing login endpoint with default admin credentials..." -ForegroundColor Yellow
    
    $loginBody = @{
        email = "admin@vtria.com"
        password = "VtriaAdmin@2024"
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-WebRequest -Uri 'http://localhost:8080/vtria-erp/api/auth/login' -Method POST -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
        Write-Host "Login Status: $($loginResponse.StatusCode)" -ForegroundColor Green
        Write-Host "Login Response: $($loginResponse.Content)" -ForegroundColor Green
        Write-Host "`nLogin successful! Authentication is working correctly." -ForegroundColor Green
    } catch {
        Write-Host "Login Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $responseStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($responseStream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody" -ForegroundColor Red
        }
    }
    
} catch { 
    Write-Host "Health Check Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "The server may not be running. Please start the server using 'node direct-start.js'" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`nPress any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
