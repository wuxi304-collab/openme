# Device Guard fallback — normalized by maintainer
# scripts/install-desktop-shortcut.ps1
#
# 在用户桌面创建 OpenMe 的 Windows 快捷方式（.lnk）。可选固定到任务栏。
#
# 设计目标：
# - **幂等**：重复运行不会重复创建；更新版本时只改 TargetPath，不留垃圾。
# - **真实便携包优先**：如果 `release/OpenMe-Qiwu-*-portable-x64.exe` 存在，
#   快捷方式指向它；否则回落到 `启动OpenMe.cmd`（开发模式入口）。
# - **正确的图标 + 工作目录**：图标取 `public/icons/icon.ico`，工作目录设到
#   项目根目录，这样相对路径和命令行文件参数都能正常工作。
# - **可固定到任务栏**：加 -PinToTaskbar 参数，用 Windows Shell COM 把快捷方式
#   固定到任务栏（PowerShell 调用 verb="taskbarpin"）。
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File .\scripts\install-desktop-shortcut.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\install-desktop-shortcut.ps1 -PinToTaskbar
#   powershell -ExecutionPolicy Bypass -File .\scripts\install-desktop-shortcut.ps1 -Force

[CmdletBinding()]
param(
    [switch]$PinToTaskbar,
    [switch]$Force,
    [string]$ShortcutName = "OpenMe 旗悟"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# 1. 解析项目根目录（脚本所在目录的上两级：scripts/ -> root）
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$ProjectRootPath = $ProjectRoot.Path

Write-Host "[OpenMe Shortcut Installer]" -ForegroundColor Cyan
Write-Host ("  ProjectRoot : {0}" -f $ProjectRootPath)

# 2. 选择 TargetPath：优先便携包；回落 .cmd 入口
$Portable = Get-ChildItem -Path (Join-Path $ProjectRootPath "release") -Filter "OpenMe-Qiwu-*-portable-x64.exe" -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

$CmdEntry = Join-Path $ProjectRootPath "启动OpenMe.cmd"

if ($Portable) {
    $TargetPath = $Portable.FullName
    $TargetKind = "portable"
    Write-Host ("  Target      : {0} ({1} MB)" -f $TargetPath, [Math]::Round($Portable.Length / 1MB, 1)) -ForegroundColor Green
} elseif (Test-Path $CmdEntry) {
    $TargetPath = $CmdEntry
    $TargetKind = "cmd"
    Write-Host ("  Target      : {0} (dev entry)" -f $TargetPath) -ForegroundColor Yellow
} else {
    Write-Error "No portable exe found in release/ AND 启动OpenMe.cmd missing. Run `npm run build` first or restore 启动OpenMe.cmd."
    exit 1
}

# 3. 选择图标
$IconPath = Join-Path $ProjectRootPath "public\icons\icon.ico"
if (-not (Test-Path $IconPath)) {
    Write-Warning "Icon not found at $IconPath — shortcut will use default icon."
    $IconPath = $null
} else {
    Write-Host ("  Icon        : {0}" -f $IconPath)
}

# 4. 桌面路径 + 快捷方式文件路径
$DesktopDir = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopDir ($ShortcutName + ".lnk")

# 幂等：如果已存在，提示是否覆盖（-Force 跳过提示）
if ((Test-Path $ShortcutPath) -and -not $Force) {
    $existing = (Get-Item $ShortcutPath -ErrorAction SilentlyContinue).TargetPath
    Write-Host ("  Existing    : {0} -> {1}" -f $ShortcutPath, $existing) -ForegroundColor DarkGray
    $answer = Read-Host "  Shortcut already exists. Recreate? [y/N]"
    if ($answer -notin @("y", "Y", "yes", "YES")) {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
    Remove-Item $ShortcutPath -Force
}

# 5. 用 WScript.Shell COM 创建 .lnk
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $ProjectRootPath
$Shortcut.WindowStyle = 3  # 3 = Maximized (Electron app picks it up cleanly)
$Shortcut.IconLocation = if ($IconPath) { "$IconPath,0" } else { "" }
$Shortcut.Description = "OpenMe Qiwu — 本地优先的桌面文件工作台"
# 拖拽文件：在 TargetPath 后接 "%*" 就能透传命令行参数。
# 便携包接受 file paths 作为 argv；.cmd 入口已支持 %*。
$Shortcut.Arguments = ""
$Shortcut.Save()
Write-Host ("  Created     : {0}" -f $ShortcutPath) -ForegroundColor Green

# 6. 可选：固定到任务栏
if ($PinToTaskbar) {
    Write-Host "  Pinning to taskbar..." -ForegroundColor Cyan
    try {
        $PinVerb = "taskbarpin"
        $Shell = New-Object -ComObject Shell.Application
        $Folder = $Shell.Namespace((Split-Path $ShortcutPath))
        $Item = $Folder.ParseName((Split-Path $ShortcutPath -Leaf))
        if ($Item) {
            $Verbs = $Item.Verbs() | Where-Object { $_.Name -match 'Pin|Taskbar|任务栏' }
            if ($Verbs) {
                $Verbs | ForEach-Object { $_.DoIt() }
                Write-Host "  Pinned to taskbar." -ForegroundColor Green
            } else {
                Write-Warning "Taskbar-pin verb not found on this Windows version. Right-click the desktop shortcut → 'Pin to taskbar'."
            }
        }
    } catch {
        Write-Warning "Failed to pin to taskbar: $($_.Exception.Message). Right-click the desktop shortcut → 'Pin to taskbar'."
    }
}

Write-Host ""
Write-Host "Done. Double-click the desktop icon to launch OpenMe." -ForegroundColor Green
Write-Host ("  Tip: drop files onto the icon to open them with OpenMe.") -ForegroundColor DarkGray
