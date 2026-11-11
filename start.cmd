@echo off
rem Double-click to start Chinese Teacher. To use it from your phone too, run: start.cmd phone
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS version from https://nodejs.org, install it, then run this again.
  pause
  exit /b 1
)
node scripts\start.mjs %*
if errorlevel 1 pause
