// scripts/prepare-dist.mjs
//
// Pre-flight check for `npm run dist`. Verifies that the two native binaries
// the Electron app shells out to are present on disk before electron-builder
// runs, so a half-baked release never lands.
//
//   1. ffmpeg-static/ffmpeg.exe
//      npm's postinstall hook normally downloads this from
//      github.com/eugeneware/ffmpeg-static, but the install often fails
//      silently behind corporate proxies or partial mirrors. If the file
//      is missing we re-run the install script so the next `npm run dist`
//      can pack the binary into extraResources.
//
//   2. cad-host/publish/CadHost.exe
//      This is built from a sibling .NET 8 project. The source files are
//      committed but the publish output is gitignored. We invoke
//      `dotnet publish` (or refuse with a clear error if dotnet isn't on
//      the local dotnet root). End users don't need dotnet; only the
//      build machine does.
//
// The script is idempotent: re-running it on a clean tree is a no-op.

import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { checkCadHostParity, STATUS as PARITY_STATUS } from "./cad-host-parity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ffmpegStaticExe = path.join(root, "node_modules", "ffmpeg-static", "ffmpeg.exe");
const cadHostExe = path.join(root, "cad-host", "publish", "CadHost.exe");

const issues = [];

if (process.platform === "win32" && !existsSync(ffmpegStaticExe)) {
  console.log("[prepare-dist] ffmpeg.exe missing — re-running ffmpeg-static install.js");
  try {
    execFileSync(process.execPath, ["install.js"], {
      cwd: path.dirname(ffmpegStaticExe),
      stdio: "inherit",
    });
  } catch (err) {
    issues.push("ffmpeg-static install failed. Run `cd node_modules/ffmpeg-static && node install.js` manually to inspect.");
  }
}

if (process.platform === "win32" && !existsSync(cadHostExe)) {
  console.log("[prepare-dist] cad-host/publish/CadHost.exe missing — invoking dotnet publish");
  const dotnetRoot = path.join(process.env.LOCALAPPDATA || "", "OpenMeBuild", "dotnet", "dotnet.exe");
  const dotnetExe = existsSync(dotnetRoot) ? dotnetRoot : "dotnet";
  try {
    execFileSync(
      dotnetExe,
      [
        "publish",
        "cad-host/CadHost.csproj",
        "-c",
        "Release",
        "-r",
        "win-x64",
        "--self-contained",
        "true",
        "-p:PublishSingleFile=false",
        "-p:DebugType=None",
        "-o",
        "cad-host/publish",
      ],
      { cwd: root, stdio: "inherit" }
    );
  } catch (err) {
    issues.push(
      "cad-host publish failed. Run `scripts\\build-cad-host.cmd` to build the sidecar " +
        "reproducibly and see the actual error."
    );
  }
}

// Parity runs even when CadHost.exe already exists, because the stale case is
// precisely the case where the exe is present and merely old. Gating this on
// existence would make it useless.
const parity = checkCadHostParity();
if (parity.status === PARITY_STATUS.MISMATCH) {
  // A release must not ship a sidecar that is not the build we just made.
  issues.push("cad-host sidecar is stale. " + parity.detail);
} else if (parity.status === PARITY_STATUS.NO_REFERENCE) {
  // Nothing to compare against. Worth saying out loud, not worth failing a
  // release over — this is the normal state of a machine that only ever
  // installed a prebuilt sidecar.
  console.warn("[prepare-dist] " + parity.detail);
}

if (issues.length > 0) {
  console.error("[prepare-dist] FAIL:");
  for (const msg of issues) console.error("  - " + msg);
  process.exit(1);
}

if (existsSync(ffmpegStaticExe)) {
  const mb = (statSync(ffmpegStaticExe).size / (1024 * 1024)).toFixed(1);
  console.log(`[prepare-dist] ffmpeg.exe OK (${mb} MB)`);
}
if (existsSync(cadHostExe)) {
  console.log("[prepare-dist] cad-host/publish/CadHost.exe OK");
}

console.log("[prepare-dist] ready for `npm run dist`");
