@echo off
rem 启动OpenMe.cmd — 一键启动 OpenMe 项目入口。
rem
rem 优先级：
rem   1) release\win-unpacked\OpenMe.exe（已构建的开发版，秒开）
rem   2) release\OpenMe-Qiwu-*-portable-x64.exe（最新便携包，离线可用）
rem   3) npm run electron（终极回退，没构建过任何东西时）
rem
rem 用法：
rem   启动OpenMe.cmd                  —— 冷启动
rem   启动OpenMe.cmd a.flac b.mp3     —— 启动并打开这些文件
rem   启动OpenMe.cmd --help           —— 透传任意命令行参数到 Electron

setlocal

pushd "%~dp0"

rem 把 %* 收集起来，稍后透传。%~f1 是首个参数的完整路径（若有）。
set "ARGS="
:collect_args
if "%~1"=="" goto :args_done
if not "%ARGS%"=="" set "ARGS=%ARGS% "
set "ARGS=%ARGS%"%~1""
shift
goto :collect_args
:args_done

rem 优先级 1：开发构建
if exist "%~dp0release\win-unpacked\OpenMe.exe" (
  echo [启动OpenMe] 启动开发构建：release\win-unpacked\OpenMe.exe %ARGS%
  start "" "%~dp0release\win-unpacked\OpenMe.exe" %ARGS%
  popd
  exit /b 0
)

rem 优先级 2：最新便携包
set "PORTABLE="
for /f "delims=" %%i in ('dir /b /od "%~dp0release\OpenMe-Qiwu-*-portable-x64.exe" 2^>nul') do (
  set "PORTABLE=%%i"
)
if defined PORTABLE (
  echo [启动OpenMe] 启动便携包：release\%PORTABLE% %ARGS%
  start "" "%~dp0release\%PORTABLE%" %ARGS%
  popd
  exit /b 0
)

rem 优先级 3：npm run electron（终极回退）
echo [启动OpenMe] 没找到 release\，回退到 npm run electron
pushd "%~dp0"
call npx electron . %ARGS%
popd
endlocal
