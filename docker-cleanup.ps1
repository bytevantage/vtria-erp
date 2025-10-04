# Docker Cleanup Script for VTRIA ERP
# This script cleans up Docker to resolve build issues

Write-Host "🧹 Starting Docker cleanup..." -ForegroundColor Cyan

try {
    # Stop all containers
    Write-Host "Stopping all containers..." -ForegroundColor Yellow
    docker stop $(docker ps -aq) 2>$null

    # Remove all containers
    Write-Host "Removing all containers..." -ForegroundColor Yellow
    docker rm $(docker ps -aq) 2>$null

    # Remove all images
    Write-Host "Removing all images..." -ForegroundColor Yellow
    docker rmi $(docker images -q) 2>$null

    # Remove all volumes
    Write-Host "Removing all volumes..." -ForegroundColor Yellow
    docker volume rm $(docker volume ls -q) 2>$null

    # Remove all networks (except default ones)
    Write-Host "Removing unused networks..." -ForegroundColor Yellow
    docker network prune -f

    # Clean up build cache
    Write-Host "Cleaning build cache..." -ForegroundColor Yellow
    docker builder prune -af

    # System cleanup
    Write-Host "Running system cleanup..." -ForegroundColor Yellow
    docker system prune -af --volumes

    Write-Host "✅ Docker cleanup completed successfully!" -ForegroundColor Green
    Write-Host "You can now run the deployment script again." -ForegroundColor Cyan

} catch {
    Write-Host "❌ Error during cleanup: $_" -ForegroundColor Red
}