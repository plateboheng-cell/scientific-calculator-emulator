@echo off
if exist "%~dp0release\windows\win-unpacked\CNX Calculator.exe" (
  start "" "%~dp0release\windows\win-unpacked\CNX Calculator.exe"
) else if exist "%~dp0release\win-unpacked\CNX Calculator.exe" (
  start "" "%~dp0release\win-unpacked\CNX Calculator.exe"
) else (
  echo Please build the app first: npm ci ^&^& npm run pack
  pause
)
