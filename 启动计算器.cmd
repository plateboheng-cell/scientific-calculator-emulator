@echo off
if exist "%~dp0release\win-unpacked\scientific calculator simulator.exe" (
  start "" "%~dp0release\win-unpacked\scientific calculator simulator.exe"
  exit /b
)
if exist "%~dp0release\current.txt" for /f "usebackq delims=" %%D in ("%~dp0release\current.txt") do if exist "%~dp0release\%%D\win-unpacked\scientific calculator simulator.exe" (
  start "" "%~dp0release\%%D\win-unpacked\scientific calculator simulator.exe"
  exit /b
)
if exist "%~dp0release\windows\win-unpacked\scientific calculator simulator.exe" (
  start "" "%~dp0release\windows\win-unpacked\scientific calculator simulator.exe"
) else if exist "%~dp0release\win-unpacked\scientific calculator simulator.exe" (
  start "" "%~dp0release\win-unpacked\scientific calculator simulator.exe"
) else (
  echo Please build the app first: npm ci ^&^& npm run pack
  pause
)
