@echo off
setlocal
pushd "%~dp0"
if exist "%~dp0release\win-unpacked\OpenMe.exe" (
  start "" "%~dp0release\win-unpacked\OpenMe.exe"
  popd
  exit /b 0
)
set "OPENME_USE_DIST=1"
set "ELECTRON_ENABLE_LOGGING=1"
start "" "%~dp0node_modules\electron\dist\electron.exe" .
popd
endlocal
