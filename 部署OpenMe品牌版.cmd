@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title OpenMe 品牌部署
net session >nul 2>&1
if errorlevel 1 (
  echo [需要管理员权限]
  echo 请关闭窗口，右键“部署OpenMe品牌版.cmd”，选择“以管理员身份运行”。
  pause
  exit /b 1
)
set "NPM_CONFIG_USERCONFIG=%~dp0.npmrc"
set "npm_config_cache=%~dp0.npm-cache"
echo [1/8] 关闭正在运行的旧版 OpenMe...
taskkill /f /im OpenMe.exe >nul 2>&1
timeout /t 2 /nobreak >nul
if exist "release\win-unpacked" rmdir /s /q "release\win-unpacked"
if exist "release\win-unpacked" (
  echo [失败] 旧版文件仍被占用。请关闭 OpenMe 后重试。
  pause
  exit /b 1
)
echo [2/8] 清理损坏的签名工具缓存...
if exist "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign" rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign"
echo [3/8] 构建 ACadSharp CAD 引擎...
if not exist "cad-host\publish\CadHost.exe" call "安装CAD引擎.cmd" --silent
if errorlevel 1 goto :fail
echo [4/8] 构建界面与马里奥主题...
call npm run build
if errorlevel 1 goto :fail
echo [5/8] 生成带 OpenMe Logo 的 Windows 程序...
call npx electron-builder --win dir
if errorlevel 1 goto :fail
echo 使用 Electron 官方可信启动文件，避免 Smart App Control 拦截...
copy /y "node_modules\electron\dist\electron.exe" "release\win-unpacked\OpenMe.exe" >nul
copy /y "public\icons\icon.ico" "release\win-unpacked\OpenMe.ico" >nul
echo [6/8] 验证程序...
if not exist "release\win-unpacked\OpenMe.exe" goto :fail
echo [7/8] 生成精简交付压缩包...
if exist "release\OpenMe-Windows-x64.zip" del /f /q "release\OpenMe-Windows-x64.zip"
powershell.exe -NoProfile -Command "Compress-Archive -Path 'release\win-unpacked\*' -DestinationPath 'release\OpenMe-Windows-x64.zip' -CompressionLevel Optimal -Force"
if errorlevel 1 goto :fail
echo [8/8] 创建桌面与开始菜单快捷方式...
powershell.exe -NoProfile -Command "$exe=(Resolve-Path 'release\win-unpacked\OpenMe.exe').Path; $ws=New-Object -ComObject WScript.Shell; foreach($link in @((Join-Path ([Environment]::GetFolderPath('Desktop')) 'OpenMe.lnk'),(Join-Path ([Environment]::GetFolderPath('Programs')) 'OpenMe.lnk'))){$sc=$ws.CreateShortcut($link);$sc.TargetPath=$exe;$sc.WorkingDirectory=(Split-Path $exe);$sc.IconLocation=(Join-Path (Split-Path $exe) 'OpenMe.ico')+',0';$sc.Description='OpenMe 文件工作台';$sc.Save()}"
echo.
echo 部署完成：release\win-unpacked\OpenMe.exe
echo 今后双击 启动OpenMe.cmd 会优先启动品牌版程序。
pause
exit /b 0
:fail
echo.
echo 部署失败，请把本窗口最后 40 行发给 Codex。
pause
exit /b 1
