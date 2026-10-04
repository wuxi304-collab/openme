// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FILE_FORMATS } from "./file-registry";

const MAIN_JS = readFileSync(resolve(__dirname, "../electron/main.js"), "utf8");

/**
 * `openme-media://` is gated by a hardcoded extension allowlist in the main
 * process. That is a second extension map living outside the registry, and the
 * whole reason `detectFileType()` was deleted was that it drifted. This test is
 * the anti-drift gate: any audio/video format the registry learns about must be
 * servable by the media scheme in the same commit, or `get-media-url` starts
 * returning MEDIA_NOT_FOUND for a format the app claims to support.
 */
function parseAllowlist(): Set<string> {
  const block = MAIN_JS.match(/const MEDIA_EXTENSIONS = new Set\(\[([\s\S]*?)\]\);/);
  expect(block, "MEDIA_EXTENSIONS set not found in electron/main.js").toBeTruthy();
  const found = new Set<string>();
  for (const match of (block as RegExpExecArray)[1].matchAll(/"(\.[a-z0-9]+)"/gi)) {
    found.add(match[1].toLowerCase());
  }
  return found;
}

describe("openme-media allowlist", () => {
  const allowlist = parseAllowlist();
  const registryMedia = FILE_FORMATS
    .filter((format) => format.category === "audio" || format.category === "video")
    .map((format) => format.extension.toLowerCase());

  it("serves every audio/video extension the registry declares", () => {
    const missing = [...new Set(registryMedia)].filter((extension) => !allowlist.has(extension));
    expect(
      missing,
      `electron/main.js MEDIA_EXTENSIONS is missing registry formats: ${missing.join(", ")}. ` +
        "Add them, or the media viewer cannot open those files.",
    ).toEqual([]);
  });

  it("does not allowlist extensions the registry does not know about", () => {
    // A stale entry is not harmless: it keeps a path servable after the registry
    // has stopped classifying that extension as media.
    const known = new Set(registryMedia);
    const stale = [...allowlist].filter((extension) => !known.has(extension));
    expect(stale, `stale MEDIA_EXTENSIONS entries: ${stale.join(", ")}`).toEqual([]);
  });

  it("is applied at both entry points, not just the IPC handler", () => {
    // The protocol handler is the actual read primitive. Gating only
    // get-media-url leaves the hole open, because anything that can put an
    // openme-media:// URL into the renderer bypasses the IPC layer entirely.
    const gateCalls = MAIN_JS.match(/isServableMediaPath\(/g) ?? [];
    // 1 = the definition; the call sites are get-media-url and protocol.handle.
    expect(gateCalls.length).toBeGreaterThanOrEqual(3);
    const protocolHandler = MAIN_JS.match(/protocol\.handle\(\s*["']openme-media["'][\s\S]{0,600}/);
    expect(protocolHandler, "openme-media protocol handler not found").toBeTruthy();
    expect((protocolHandler as RegExpExecArray)[0]).toMatch(/isServableMediaPath\(/);
  });
});
