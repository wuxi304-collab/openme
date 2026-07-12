@echo off
REM Launches the latest portable release of OpenMe built from this checkout.
REM If the binary is stale (changes since last `npm run dist`), re-run that
REM script first. The window closes automatically after the app exits.
chcp 65001 >nul
title OpenMe Qiwu — Portable
pushd "%~dp0\.."
set "EXE=%~dp0..\release\OpenMe-Qiwu-0.1.0-portable-x64.exe"
if not exist "%EXE%" (
  echo [OpenMe] Portable not built yet — running ^`npm run dist^` first...
  call npm run dist || goto :err
)
if not exist "%EXE%" (
  echo [OpenMe] Portable binary still missing under release\. Aborting.
  goto :err
)
echo ========================================
echo   OpenMe Qiwu  PORTABLE RELEASE
echo   %EXE%
echo ========================================
start "" "%EXE%"
popd
goto :eof
:err
popd
exit /b 1
