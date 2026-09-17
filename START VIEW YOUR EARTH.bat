@echo off
setlocal
cd /d "%~dp0"

title VIEW YOUR EARTH

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Please install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not available in PATH.
  echo Please restart Windows after installing Node.js, then try again.
  pause
  exit /b 1
)

if not exist "node_modules\express" (
  echo Installing website components for the first run...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Please open this folder in a terminal to see the error.
    pause
    exit /b 1
  )
)

echo Starting VIEW YOUR EARTH...
start "VIEW YOUR EARTH SERVER" /min cmd /c "cd /d "%~dp0" && npm start"

timeout /t 3 /nobreak >nul

start "" "http://localhost:3000"

echo.
echo VIEW YOUR EARTH is running at http://localhost:3000
 echo Keep the small server window open while using the website.
echo You can close it when you are finished.
exit /b 0
