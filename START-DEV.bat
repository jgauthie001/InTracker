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

REM Sync parts.csv from production data directory
if exist "data\parts.csv" (
    xcopy /Y /Q "data\parts.csv" "data-dev\" >nul
    echo Synced parts.csv from data\ to data-dev\
)

REM Ensure public-dev directory exists (dev gets its own frontend sandbox)
if not exist "public-dev" mkdir "public-dev"
if not exist "public-dev\css" mkdir "public-dev\css"
if not exist "public-dev\js" mkdir "public-dev\js"

REM Seed public-dev from public\ if files are missing (first-time setup only)
if not exist "public-dev\index.html" (
    xcopy /Y /Q "public\index.html" "public-dev\" >nul
    echo Seeded public-dev\index.html from public\
)
if not exist "public-dev\css\style.css" (
    xcopy /Y /Q "public\css\style.css" "public-dev\css\" >nul
    echo Seeded public-dev\css\style.css from public\
)
if not exist "public-dev\js\app.js" (
    xcopy /Y /Q "public\js\app.js" "public-dev\js\" >nul
    echo Seeded public-dev\js\app.js from public\
)

echo.
echo ============================================
echo  InTracker [DEVELOPMENT]
echo ============================================
echo  Port:         3031
echo  Data dir:     data-dev\
echo  Production:   http://localhost:3030
echo.
echo  Open your browser to: http://localhost:3031
echo  On the network:       http://%COMPUTERNAME%:3031
echo.
echo  Press Ctrl+C to stop the server.
echo ============================================
echo.

set PORT=3031
set DATA_DIR=data-dev
set STATIC_DIR=public-dev
node server.js
pause
