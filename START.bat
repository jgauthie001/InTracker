@echo off
title InTracker
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

echo Starting InTracker server...
echo.
echo  Open your browser to: http://localhost:3030
echo  On the network:       http://%COMPUTERNAME%:3030
echo.
echo  Press Ctrl+C to stop the server.
echo.
node server.js
pause
