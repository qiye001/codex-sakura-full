@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1" -Launch
if errorlevel 1 (
 echo Installation failed. Read the error above and README.zh-CN.md.
 pause
 exit /b 1
)
echo Installation complete. Read README.zh-CN.md for wallpaper and animation settings.
pause
