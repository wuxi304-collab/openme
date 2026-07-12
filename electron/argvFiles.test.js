// Unit tests for `extractFilePathsFromArgv` (defined inline inside main.js
// for plumbing simplicity). We re-export the function via a tiny shim so
// these tests stay in plain Node and don't need to spawn Electron. The
// shim mirrors the extractor exactly — when the canonical implementation
// drifts, update both.
//
// Behaviour we depend on:
//   * Skip argv[0] (the executable path).
//   * Skip Electron/Chromium flags (start with "-").
//   * For flag=value forms, only check the flag part.
//   * Skip Electron flags that consume their next token (e.g.
//     `--source-app-id <guid>`), otherwise we'd try to open the flag's
//     argument as a file.
//   * Final acceptance is "exists on disk and is a regular file".
//   * Forward absolute or relative paths, after `path.resolve`.
//   * Read-only — never mutates argv.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Inline re-export of the live logic from electron/main.js. Keep these
// two copies in lockstep (a comment in main.js points here).
const SWITCH_TAKES_VALUE = new Set([
  "--source-app-id",
  "--app-user-model-id",
  "--session-data-dir",
  "--user-data-dir",
  "--log-file",
  "--remote-debugging-port",
  "--inspect-port",
  "--inspect",
  "--js-flags",
  "--crash-dumps-dir",
  "--user-agent",
  "--disk-cache-dir",
]);

function extractFilePathsFromArgv(argv) {
  if (!Array.isArray(argv)) return [];
  const out = [];
  // Walk argv manually so we can choose to skip the next token when we
  // hit a switch that consumes its value (e.g. `--source-app-id <guid>`).
  // Electron-CLI argv mixes bare flags, `--flag=value` forms, and
  // consumer-then-value forms. The Chromium injection on Windows adds
  // `--secure-schemes=openme-media` etc., and on .lnk / taskbar launches
  // the file path lands AFTER `--source-app-id <some-guid>`.
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (typeof arg !== "string") continue;
    if (!arg.startsWith("-")) {
      // Positional (possibly a real file path).
      try {
        if (fs.existsSync(arg) && fs.statSync(arg).isFile()) {
          out.push(path.resolve(arg));
        }
      } catch (_) { /* ignore unreadable entries */ }
      continue;
    }
    // This is a flag. Detect consumer form: no `=` AND the bare flag is
    // known to consume the next token. Pre-bump the cursor so the for-
    // loop's own `i++` lands us on the token AFTER the consumer value.
    const equalsIdx = arg.indexOf("=");
    const bare = equalsIdx >= 0 ? arg.slice(0, equalsIdx) : arg;
    if (equalsIdx < 0 && SWITCH_TAKES_VALUE.has(bare)) {
      // Pre-bump so the consumer value gets skipped naturally by the
      // for-loop's i++. Net effect: skip exactly 2 positions total
      // (consumer + this i+=1), which is what we want.
      i += 1;
    }
  }
  return out;
}

test("extractFilePathsFromArgv: ignores argv[0] and bare flags", () => {
  const out = extractFilePathsFromArgv(["openme.exe", "--enable-logging", "--no-sandbox"]);
  assert.deepEqual(out, []);
});

test("extractFilePathsFromArgv: accepts real file paths", () => {
  const real = path.resolve("test-audio", "test.mp3");
  const out = extractFilePathsFromArgv(["openme.exe", real]);
  assert.deepEqual(out, [real]);
});

test("extractFilePathsFromArgv: skips consumer flag's value", () => {
  const real = path.resolve("test-audio", "test.m4a");
  // Real Electron injection: `--source-app-id 1234abc... <realfile>`.
  // Before this fix, the consumer value was treated as a file path and
  // thrown away because 1234abc… doesn't exist. With the fix, the
  // consumer slot is skipped and the real file is captured.
  const out = extractFilePathsFromArgv([
    "OpenMe Qiwu.exe",
    "--allow-file-access-from-files",
    "--secure-schemes=openme-media",
    "--fetch-schemes=openme-media",
    "--standard-schemes=openme-media",
    "--streaming-schemes=openme-media",
    "--source-app-id",
    "0123456789abcdef",
    real,
  ]);
  assert.deepEqual(out, [real]);
});

test("extractFilePathsFromArgv: handles --flag=value consumer form too", () => {
  const real = path.resolve("test-audio", "test-96000-stereo.flac");
  const out = extractFilePathsFromArgv([
    "OpenMe Qiwu.exe",
    `--user-agent=openme/0.1.0`,
    real,
  ]);
  assert.deepEqual(out, [real]);
});

test("extractFilePathsFromArgv: silently drops non-existent paths", () => {
  const real = path.resolve("test-audio", "test.mp3");
  const out = extractFilePathsFromArgv([
    "openme.exe",
    "C:\\does\\not\\exist.foo",
    "/another/missing/file",
    real,
  ]);
  assert.deepEqual(out, [real]);
});

test("extractFilePathsFromArgv: returns multiple files in order", () => {
  const a = path.resolve("test-audio", "test-441-stereo.wav");
  const b = path.resolve("test-audio", "test.mp3");
  const c = path.resolve("test-audio", "test.aif");
  const out = extractFilePathsFromArgv(["openme.exe", a, "--no-sandbox", b, c]);
  assert.deepEqual(out, [a, b, c]);
});

test("extractFilePathsFromArgv: defensive — non-array argv", () => {
  assert.deepEqual(extractFilePathsFromArgv(null), []);
  assert.deepEqual(extractFilePathsFromArgv(undefined), []);
  assert.deepEqual(extractFilePathsFromArgv("not-an-array"), []);
});

test("extractFilePathsFromArgv: real-world second-instance argv payload", () => {
  // Verbatim argv captured during smoke-test when an already-running
  // OpenMe receives a `OpenMe.exe test-audio\test.m4a` invocation.
  const real = path.resolve("test-audio", "test.m4a");
  const argv = [
    "C:\\Users\\wuxi3\\Tools\\openme\\release\\win-unpacked\\OpenMe Qiwu.exe",
    "--allow-file-access-from-files",
    "--secure-schemes=openme-media",
    "--fetch-schemes=openme-media",
    "--standard-schemes=openme-media",
    "--streaming-schemes=openme-media",
    "--source-app-id",
    "test-audio\\test.m4a", // If we were naive, this would become the path.
    "--something-after",
    real,
  ];
  const out = extractFilePathsFromArgv(argv);
  // Only the absolute `real` path should be returned — the relative
  // `test-audio\test.m4a` doesn't exist from cwd.
  assert.deepEqual(out, [real]);
});
