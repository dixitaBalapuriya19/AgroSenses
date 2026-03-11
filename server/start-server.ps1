# Start Local Backend Server for AgroSense
# Run this script to start the Flask backend on port 8000

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting AgroSense Backend Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# Check if virtual environment exists
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "[1/3] Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv --without-pip
    & venv\Scripts\Activate.ps1
    python -m ensurepip --upgrade
} else {
    Write-Host "[1/3] Virtual environment found, activating..." -ForegroundColor Green
    & venv\Scripts\Activate.ps1
}

Write-Host ""
Write-Host "[2/3] Installing dependencies..." -ForegroundColor Yellow
pip install --upgrade pip
pip install -r requirements.txt

Write-Host ""
Write-Host "[3/3] Starting Flask server on http://localhost:8000..." -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Server will be available at:" -ForegroundColor White
Write-Host "  http://localhost:8000" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press CTRL+C to stop the server" -ForegroundColor Yellow
Write-Host ""

python app.py
