@echo off
REM scripts/build-cad-host.cmd
REM
REM Reproducible build + publish of the ACadSharp sidecar, followed by the
REM md5 parity check that AGENTS.md warns about.
REM
REM Publishing straight into cad-host\publish is deliberate: it regenerates
REM CadHost.exe, CadHost.dll, the deps/runtimeconfig files and the whole
REM self-contained runtime in one step, which removes the bin -> publish copy
REM dance that is the documented source of silent staleness.
REM
REM Usage:  scripts\build-cad-host.cmd
REM Needs:  .NET SDK 8.0 (the csproj targets net8.0). A runtime alone cannot
REM         compile; `dotnet --list-sdks` must print something.

setlocal
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..\cad-host
set PUBLISH_DIR=%PROJECT_DIR%\publish

echo [build-cad-host] project: %PROJECT_DIR%

where dotnet >nul 2>nul
if errorlevel 1 (
  echo [build-cad-host] FAIL: dotnet not on PATH. Install the .NET SDK 8.0:
  echo   https://dotnet.microsoft.com/download/dotnet/8.0
  exit /b 1
)

REM An SDK-less machine that still has a runtime will pass `where` but fail to
REM build, so check for an SDK explicitly and say something actionable.
dotnet --list-sdks > "%TEMP%\openme-dotnet-sdks.txt" 2>nul
if errorlevel 1 (
  echo [build-cad-host] FAIL: `dotnet --list-sdks` failed. Only a runtime is installed; a runtime cannot compile.
  exit /b 1
)
findstr /C:"8." "%TEMP%\openme-dotnet-sdks.txt" >nul 2>nul
if errorlevel 1 (
  echo [build-cad-host] WARN: no 8.x SDK listed. A 9/10 SDK can still target net8.0 but will
  echo                 pull the reference packs from NuGet, so the first build needs network.
  type "%TEMP%\openme-dotnet-sdks.txt"
)

echo [build-cad-host] restoring...
dotnet restore "%PROJECT_DIR%\CadHost.csproj" || goto :fail
echo [build-cad-host] building...
dotnet build "%PROJECT_DIR%\CadHost.csproj" -c Release --no-restore || goto :fail
echo [build-cad-host] publishing into %PUBLISH_DIR% ...
dotnet publish "%PROJECT_DIR%\CadHost.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -p:PublishTrimmed=false -o "%PUBLISH_DIR%" || goto :fail

echo [build-cad-host] parity check...
node "%SCRIPT_DIR%cad-host-parity.mjs" || goto :fail

REM Verify the rebuilt binary actually runs on THIS machine. Smart App Control
REM on some machines blocks freshly built DLLs, and the only way to know is to
REM execute it.
REM
REM There is no argv verb that works without a drawing: Program.cs dispatches on
REM file extension, so a .exe hits `NotSupportedException` and prints nothing.
REM `CadHost.exe < nul` is therefore the always-available check — with no argv it
REM falls into the stdin RPC loop, gets EOF immediately, and exits 0. Reaching
REM exit 0 proves the process starts and every assembly loaded, which is exactly
REM the Smart App Control / truncated-DLL failure mode we care about.
echo [build-cad-host] smoke test: process starts and links ...
"%PUBLISH_DIR%\CadHost.exe" < nul > "%TEMP%\openme-ping-out.txt" 2>&1
if errorlevel 1 (
  echo [build-cad-host] FAIL: CadHost.exe could not start here. On machines with Smart App
  echo                 Control enabled a freshly built unsigned DLL gets blocked; that needs
  echo                 signing or an installer, not a different build directory.
  type "%TEMP%\openme-ping-out.txt"
  exit /b 1
)

REM The deeper check needs a real drawing. Point CADHOST_SMOKE_DWG at one to run
REM it; without it we say so rather than pretending the render path was covered.
if "%CADHOST_SMOKE_DWG%"=="" (
  echo [build-cad-host] SKIP: --inspect / --render-svg probe. Set CADHOST_SMOKE_DWG to a
  echo                 .dwg or .dxf to exercise the real render path.
  goto :done
)

echo [build-cad-host] smoke test: --inspect %CADHOST_SMOKE_DWG%
"%PUBLISH_DIR%\CadHost.exe" --inspect "%CADHOST_SMOKE_DWG%" > "%TEMP%\openme-inspect.json" 2>nul
if errorlevel 1 (
  echo [build-cad-host] FAIL: --inspect failed on %CADHOST_SMOKE_DWG%
  exit /b 1
)
for %%F in ("%TEMP%\openme-inspect.json") do if %%~zF LSS 2 (
  echo [build-cad-host] FAIL: --inspect produced no JSON. AGENTS.md documents the empty-output failure mode.
  exit /b 1
)

REM Non-empty is the whole point: a stale publish DLL exits 0 with 0 bytes.
echo [build-cad-host] smoke test: --render-svg must be NON-empty ...
"%PUBLISH_DIR%\CadHost.exe" --render-svg "%CADHOST_SMOKE_DWG%" > "%TEMP%\openme-render-probe.svg" 2>nul
for %%F in ("%TEMP%\openme-render-probe.svg") do if %%~zF LSS 1 (
  echo [build-cad-host] FAIL: --render-svg produced no output. Exit 0 with 0 bytes is the stale-DLL symptom; see AGENTS.md.
  exit /b 1
)

:done
echo [build-cad-host] OK
exit /b 0

:fail
echo [build-cad-host] FAILED
exit /b 1
