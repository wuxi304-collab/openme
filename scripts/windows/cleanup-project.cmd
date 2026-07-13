@echo off
REM 清理项目.cmd — Tauri 弃用阶段的一次性清理脚本。
REM
REM 作用：删除 Tauri / Smart App Control 实验期残留的工件和脚本。
REM 使用：在仓库根目录以管理员身份运行一次即可，之后无需再使用。
REM
REM 注意：本脚本只针对 Tauri 时代的遗留物，docs/、cad-host/、electron/ 等
REM 真正使用的目录都保留。
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo 正在清理 OpenMe 项目（Tauri 弃用残留）...
for %%D in ("src-tauri" ".npm-cache" ".run" ".electron-profile") do (
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
echo 保留脚本：scripts\windows\start-openme.cmd / deploy-branded.cmd / install-cad-engine.cmd。
pause

