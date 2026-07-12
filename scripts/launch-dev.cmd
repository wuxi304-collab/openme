@echo off
REM Launches OpenMe in development mode.
REM Vite serves at http://localhost:1420 and Electron loads from it with HMR.
REM Close this window to stop the dev server.
chcp 65001 >nul
title OpenMe Qiwu — Dev
pushd "%~dp0\.."
echo ========================================
echo   OpenMe Qiwu  DEV MODE  (live reload)
echo   Press Ctrl+C here to stop the server
echo ========================================
call npm run electron:dev
popd
