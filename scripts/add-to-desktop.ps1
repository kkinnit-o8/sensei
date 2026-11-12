# Creates a "Chinese Teacher" shortcut on your desktop that starts the app (start.cmd).
# Run it by double-clicking add-to-desktop.cmd in the app folder. Safe to run again.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root 'start.cmd'
if (-not (Test-Path $target)) { throw "start.cmd was not found in $root" }

# Works with desktops moved into OneDrive too.
$desktop = [Environment]::GetFolderPath('Desktop')
$path = Join-Path $desktop 'Chinese Teacher.lnk'

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($path)
$lnk.TargetPath = $target
$lnk.WorkingDirectory = $root
$lnk.IconLocation = (Join-Path $root 'app\favicon.ico') + ',0'
$lnk.Description = 'Start Chinese Teacher'
$lnk.Save()

Write-Host "Created: $path"
