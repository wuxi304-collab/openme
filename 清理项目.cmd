@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo 正在清理 OpenMe 项目...
for %%D in ("src-tauri" ".npm-cache" ".run" ".electron-profile" "docs") do (
  if exist "%%~D" rmdir /s /q "%%~D"
)
for %%F in (
  "安装Tauri环境.cmd"
  "启动Tauri版.cmd"
  "准备Tauri编译目录.ps1"
  "切换SmartAppControl评估模式.cmd"
  "切换SmartAppControl评估模式.ps1"
  "切换SmartAppControl为评估模式.reg"
  "恢复SmartAppControl.ps1"
  "恢复SmartAppControl强制模式.reg"
  "[右键管理员运行]切换SAC评估模式.cmd"
  "SmartAppControl-backup.txt"
  "src\components\layout\Toolbar.tsx"
  "src\components\SearchBar.tsx"
  "src\platform\desktopBridge.ts"
  "logo.png"
  "public\logo.png"
  "public\logo-optimized.png"
) do if exist "%%~F" del /f /q "%%~F"
echo 正在整理依赖...
call npm install
if errorlevel 1 (
  echo 依赖整理失败，但无用文件已经删除。
  pause
  exit /b 1
)
echo.
echo 清理完成。
echo 保留脚本：启动OpenMe、部署OpenMe品牌版、安装CAD引擎。
pause
