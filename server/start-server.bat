@echo off
REM Start Local Backend Server for AgroSense

echo ========================================
echo   Starting AgroSense Backend Server
echo ========================================
echo.

cd /d "%~dp0"

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [1/3] Creating virtual environment...
    python -m venv venv --without-pip
    call venv\Scripts\activate.bat
    python -m ensurepip --upgrade
) else (
    echo [1/3] Virtual environment found, activating...
    call venv\Scripts\activate.bat
)

echo.
echo [2/3] Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo [3/3] Starting Flask server on http://localhost:8000...
echo.
echo ========================================
echo   Server will be available at:
echo   http://localhost:8000
echo ========================================
echo.
echo Press CTRL+C to stop the server
echo.

python app.py

pause
