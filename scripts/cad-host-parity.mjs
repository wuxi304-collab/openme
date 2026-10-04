// scripts/cad-host-parity.mjs
//
// Detects the silent-staleness failure documented in AGENTS.md: in development
// `getCadHostPath()` resolves to `cad-host/publish/CadHost.exe`, but a local
// rebuild only refreshes `cad-host/bin/Release/net8.0/win-x64/`. The two drift
// apart and nothing complains.
//
// The symptom is nasty because it does not look like a build error:
// `CadHost --render-svg` exits 0 with 0 bytes of stdout while `--inspect` keeps
// working, so the semantic panel looks healthy while the viewer believes the
// render failed and falls back to the WebGL canvas. The user then sees a
// misleading "Error creating WebGL context" on a drawing that renders fine.
//
// This check compares the DLLs by content hash. It is imported by
// prepare-dist.mjs and runnable directly (`node scripts/cad-host-parity.mjs`),
// which is what makes it testable without invoking dotnet.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const BUILD_DLL = path.join(
  root,
  "cad-host",
  "bin",
  "Release",
  "net8.0",
  "win-x64",
  "CadHost.dll",
);
export const PUBLISH_DLL = path.join(root, "cad-host", "publish", "CadHost.dll");
export const PUBLISH_EXE = path.join(root, "cad-host", "publish", "CadHost.exe");

export const STATUS = {
  /** Neither side is present: nothing was built here. Not an error. */
  NOT_BUILT: "not-built",
  /** publish/ exists but there is no fresh build to compare against. */
  NO_REFERENCE: "no-reference",
  /** Both present and byte-identical. */
  MATCH: "match",
  /** Both present but different — the exact bug this script exists for. */
  MISMATCH: "mismatch",
};

function md5(filePath) {
  return createHash("md5").update(readFileSync(filePath)).digest("hex");
}

/**
 * @param {{ buildDll?: string, publishDll?: string }} [paths] Overridable so a
 *   test can point it at fixtures instead of the real build tree.
 */
export function checkCadHostParity(paths = {}) {
  const buildDll = paths.buildDll ?? BUILD_DLL;
  const publishDll = paths.publishDll ?? PUBLISH_DLL;

  const buildExists = existsSync(buildDll);
  const publishExists = existsSync(publishDll);

  if (!buildExists && !publishExists) {
    return {
      status: STATUS.NOT_BUILT,
      detail: "cad-host has never been built in this checkout.",
    };
  }
  if (!buildExists) {
    return {
      status: STATUS.NO_REFERENCE,
      detail:
        "cad-host/publish exists but cad-host/bin/Release/net8.0/win-x64/CadHost.dll does not, " +
        "so there is nothing to compare against. Run scripts\\build-cad-host.cmd, or copy the " +
        "published DLL over the publish folder if you trust it.",
    };
  }
  if (!publishExists) {
    return {
      status: STATUS.NO_REFERENCE,
      detail:
        "A build exists at cad-host/bin/Release/net8.0/win-x64/CadHost.dll but " +
        "cad-host/publish/CadHost.dll is missing. In dev the app reads publish/, so it will " +
        "find no engine at all.",
    };
  }

  const buildHash = md5(buildDll);
  const publishHash = md5(publishDll);
  if (buildHash === publishHash) {
    return {
      status: STATUS.MATCH,
      detail: `CadHost.dll matches (md5 ${buildHash}).`,
      buildHash,
      publishHash,
    };
  }
  return {
    status: STATUS.MISMATCH,
    detail:
      "cad-host/publish/CadHost.dll is NOT the same build as " +
      "cad-host/bin/Release/net8.0/win-x64/CadHost.dll. The app will run the stale one. " +
      `build md5 ${buildHash}, publish md5 ${publishHash}. Fix with: ` +
      'copy cad-host\\bin\\Release\\net8.0\\win-x64\\CadHost.dll cad-host\\publish\\CadHost.dll',
    buildHash,
    publishHash,
  };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = checkCadHostParity();
  const label = "[cad-host-parity]";
  if (result.status === STATUS.MATCH) {
    console.log(`${label} ${result.detail}`);
  } else if (result.status === STATUS.NOT_BUILT) {
    console.log(`${label} ${result.detail}`);
  } else if (result.status === STATUS.NO_REFERENCE) {
    console.warn(`${label} ${result.detail}`);
  } else {
    console.error(`${label} FAIL: ${result.detail}`);
    process.exit(1);
  }
}

export function publishExeSizeBytes() {
  return existsSync(PUBLISH_EXE) ? statSync(PUBLISH_EXE).size : 0;
}
