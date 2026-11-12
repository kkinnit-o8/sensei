@echo off
rem Double-click once to put a "Chinese Teacher" shortcut on your desktop.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\add-to-desktop.ps1"
if errorlevel 1 (
  echo Could not create the shortcut. See the message above.
) else (
  echo Done. From now on, start the app with the Chinese Teacher icon on your desktop.
)
pause
