@echo off
echo Starting Panavelystories Attendance System...
cd /d "%~dp0"
if not exist node_modules (
    echo First time setup: Installing required files... Please wait.
    call npm install
)
echo Server is starting...
echo To stop the application, just close this window.

:: Wait 2 seconds for server to start, then open the browser
start "" "http://localhost:3000/admin.html"

node server.js
pause
