@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title OpenMe CAD 引擎构建
set "BUILD_HOME=%LOCALAPPDATA%\OpenMeBuild"
set "DOTNET_ROOT=%BUILD_HOME%\dotnet"
set "NUGET_PACKAGES=%BUILD_HOME%\nuget"
set "PATH=%DOTNET_ROOT%;%PATH%"
if not exist "%DOTNET_ROOT%\dotnet.exe" (
  echo [1/4] 下载项目专用 .NET SDK...
  if not exist "%BUILD_HOME%" mkdir "%BUILD_HOME%"
  curl.exe -L --fail --retry 3 "https://dot.net/v1/dotnet-install.ps1" -o "%BUILD_HOME%\dotnet-install.ps1"
  if errorlevel 1 goto :fail
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%BUILD_HOME%\dotnet-install.ps1" -Channel 8.0 -InstallDir "%DOTNET_ROOT%" -NoPath
  if errorlevel 1 goto :fail
) else (
  echo [1/4] 已找到项目专用 .NET SDK。
)
echo [2/4] 恢复 ACadSharp 依赖...
dotnet restore "cad-host\CadHost.csproj"
if errorlevel 1 goto :fail
echo [3/4] 发布免安装 CadHost...
dotnet publish "cad-host\CadHost.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -p:DebugType=None -o "cad-host\publish"
if errorlevel 1 goto :fail
echo [4/4] 验证引擎...
echo {"id":"health","method":"ping","params":{}}|"cad-host\publish\CadHost.exe"
if errorlevel 1 goto :fail
echo.
echo ACadSharp CAD 引擎构建成功。最终用户无需安装 .NET。
pause
exit /b 0
:fail
echo.
echo CAD 引擎构建失败，请把本窗口完整内容发给 Codex。
pause
exit /b 1
