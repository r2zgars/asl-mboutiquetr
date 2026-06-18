@echo off
cd /d "%~dp0"

netstat -ano | findstr ":3001" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "Aslim Boutique Server" /min cmd /c "npm start"
  timeout /t 2 /nobreak >nul
)

start "" "http://localhost:3001"
