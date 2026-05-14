@echo off
title InTracker [DEV]
cd /d "%~dp0"

echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Ensure data-dev directory exists
if not exist "data-dev" mkdir "data-dev"
if not exist "data-dev\locations" mkdir "data-dev\locations"

echo.
echo ============================================
echo  InTracker [DEVELOPMENT]
echo ============================================
echo  Port:         3031
echo  Data dir:     data-dev\
echo  Frontend:     public\
echo  Production:   http://localhost:3030
echo.
echo  Edit files in E:\intracker\
echo  Run DEPLOY.bat to push to production.
echo.
echo  Open your browser to: http://localhost:3031
echo  On the network:       http://%COMPUTERNAME%:3031
echo.
echo  Press Ctrl+C to stop the server.
echo ============================================
echo.

set PORT=3031
set DATA_DIR=data-dev
node server.js
pause