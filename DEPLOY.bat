@echo off
title InTracker — Deploy to Production
cd /d "%~dp0"

echo.
echo ============================================
echo  InTracker — Deploy to Production
echo ============================================
echo.
echo  This copies changed files from:
echo    E:\intracker\          (dev / source)
echo  to:
echo    E:\InTrackerDoNotTouch\  (production)
echo  and pushes to GitHub.
echo.
echo  Production data is NOT touched.
echo.
pause

echo.
echo [1/2] Copying files to E:\InTrackerDoNotTouch...
copy /Y "server.js"              "E:\InTrackerDoNotTouch\server.js"              >nul
copy /Y "package.json"           "E:\InTrackerDoNotTouch\package.json"           >nul
copy /Y "public\index.html"      "E:\InTrackerDoNotTouch\public\index.html"      >nul
copy /Y "public\js\app.js"       "E:\InTrackerDoNotTouch\public\js\app.js"       >nul
copy /Y "public\css\style.css"   "E:\InTrackerDoNotTouch\public\css\style.css"   >nul
copy /Y "Parts Dictionary.csv"   "E:\InTrackerDoNotTouch\Parts Dictionary.csv"   >nul
echo Files copied.

echo.
echo [2/2] Committing and pushing to GitHub...
"C:\Program Files\Git\bin\git.exe" -C "%~dp0" add public\js\app.js public\css\style.css public\index.html server.js package.json ARCHITECTURE.md .gitignore

"C:\Program Files\Git\bin\git.exe" -C "%~dp0" diff --cached --quiet
if errorlevel 1 (
    set /p COMMIT_MSG=Enter commit message: 
    "C:\Program Files\Git\bin\git.exe" -C "%~dp0" commit -m "%COMMIT_MSG%"
    "C:\Program Files\Git\bin\git.exe" -C "%~dp0" push origin main
    echo Pushed to GitHub.
) else (
    echo No staged changes to commit.
)

echo.
echo ============================================
echo  Done!
echo.
echo  IMPORTANT: Restart START.bat in
echo  E:\InTrackerDoNotTouch\ to apply changes.
echo ============================================
echo.
pause
