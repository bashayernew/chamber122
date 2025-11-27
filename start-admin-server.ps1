Write-Host "Starting Admin Server..." -ForegroundColor Green
Write-Host ""
Write-Host "Server will be available at: http://localhost:8000/admin-login.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Cyan
Write-Host "  Email: bashayer@123123" -ForegroundColor White
Write-Host "  Password: bashayer123123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Change to the script directory
Set-Location $PSScriptRoot

# Start Python server
python -m http.server 8000

