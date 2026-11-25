@echo off
cd /d "%~dp0"
start "" /min cmd /c "timeout /t 1 /nobreak >nul & start "" http://127.0.0.1:3456"
node server.js
pause
