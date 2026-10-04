// Contract test for the cad-host staleness guard.
//
// The bug this guards against is silent: publish/CadHost.dll drifts behind
// bin/Release, `--render-svg` exits 0 with 0 bytes, the viewer concludes the
// render failed, and the user is shown a misleading WebGL error on a drawing
// that renders perfectly. Nothing crashes and nothing logs, so a test is the
// only thing that can catch it.

import { describe, expect, it, afterAll } from "vitest";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { checkCadHostParity, STATUS } from "./cad-host-parity.mjs";

const root = mkdtempSync(path.join(tmpdir(), "openme-cad-parity-"));

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function fixture(name: string, content?: string) {
  const file = path.join(root, name);
  mkdirSync(path.dirname(file), { recursive: true });
  if (content !== undefined) writeFileSync(file, content);
  return file;
}

describe("checkCadHostParity", () => {
  it("reports not-built when neither side exists", () => {
    const result = checkCadHostParity({
      buildDll: path.join(root, "absent", "build.dll"),
      publishDll: path.join(root, "absent", "publish.dll"),
    });
    expect(result.status).toBe(STATUS.NOT_BUILT);
  });

  it("reports no-reference when only the build side exists", () => {
    // Dev resolves to publish/, so an engine that only exists in bin/ means the
    // app finds nothing at all. Worth saying out loud.
    const result = checkCadHostParity({
      buildDll: fixture("only-build.dll", "build"),
      publishDll: path.join(root, "absent", "publish.dll"),
    });
    expect(result.status).toBe(STATUS.NO_REFERENCE);
    expect(result.detail).toMatch(/build-cad-host\.cmd|publish/);
  });

  it("reports no-reference when only the publish side exists", () => {
    const result = checkCadHostParity({
      buildDll: path.join(root, "absent", "build.dll"),
      publishDll: fixture("only-publish.dll", "publish"),
    });
    expect(result.status).toBe(STATUS.NO_REFERENCE);
  });

  it("matches when the two files are byte-identical", () => {
    const content = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]);
    const result = checkCadHostParity({
      buildDll: fixture("same-build.dll", content),
      publishDll: fixture("same-publish.dll", content),
    });
    expect(result.status).toBe(STATUS.MATCH);
    expect(result.buildHash).toBe(result.publishHash);
  });

  it("detects a stale publish, which is the whole point", () => {
    const result = checkCadHostParity({
      buildDll: fixture("stale-build.dll", "new build"),
      publishDll: fixture("stale-publish.dll", "old publish"),
    });
    expect(result.status).toBe(STATUS.MISMATCH);
    expect(result.buildHash).not.toBe(result.publishHash);
    // The message has to be actionable: a build machine without a .NET SDK has
    // to be told the exact copy command.
    expect(result.detail).toMatch(/cad-host\\publish\\CadHost\.dll/);
    expect(result.detail).toMatch(/copy /);
  });

  it("detects a one-byte difference", () => {
    // A hash comparison that ignores content would pass this. Prove it does not.
    const result = checkCadHostParity({
      buildDll: fixture("byte-build.dll", Buffer.from([1, 2, 3, 4])),
      publishDll: fixture("byte-publish.dll", Buffer.from([1, 2, 3, 5])),
    });
    expect(result.status).toBe(STATUS.MISMATCH);
  });

  it("does not confuse same-size different-content files", () => {
    const result = checkCadHostParity({
      buildDll: fixture("same-size-a.dll", Buffer.from([9, 9, 9, 9])),
      publishDll: fixture("same-size-b.dll", Buffer.from([8, 8, 8, 8])),
    });
    expect(result.status).toBe(STATUS.MISMATCH);
  });
});

describe("prepare-dist actually fails a release on a stale sidecar", () => {
  // The first version of this test grepped prepare-dist.mjs's source text for
  // the string "MISMATCH". That is exactly the kind of assertion that reads like
  // coverage while proving nothing: mutating the guard so a stale sidecar is no
  // longer fatal still satisfied all four regexes. So this runs the real script
  // in a throwaway tree instead.
  function makeTree(buildDll: string | null, publishDll: string | null) {
    const tree = mkdtempSync(path.join(tmpdir(), "openme-prepare-dist-"));
    // prepare-dist.mjs resolves its root from its own location, so the scripts
    // and the tree they inspect have to sit together.
    mkdirSync(path.join(tree, "scripts"), { recursive: true });
    copyFileSync(
      new URL("./prepare-dist.mjs", import.meta.url),
      path.join(tree, "scripts", "prepare-dist.mjs"),
    );
    copyFileSync(
      new URL("./cad-host-parity.mjs", import.meta.url),
      path.join(tree, "scripts", "cad-host-parity.mjs"),
    );
    // Both of these are "present" checks that short-circuit a network/dotnet
    // path we do not want a test to touch.
    mkdirSync(path.join(tree, "node_modules", "ffmpeg-static"), { recursive: true });
    writeFileSync(path.join(tree, "node_modules", "ffmpeg-static", "ffmpeg.exe"), "stub");
    mkdirSync(path.join(tree, "cad-host", "publish"), { recursive: true });
    writeFileSync(path.join(tree, "cad-host", "publish", "CadHost.exe"), "stub");
    if (buildDll !== null) {
      mkdirSync(path.join(tree, "cad-host", "bin", "Release", "net8.0", "win-x64"), {
        recursive: true,
      });
      writeFileSync(
        path.join(tree, "cad-host", "bin", "Release", "net8.0", "win-x64", "CadHost.dll"),
        buildDll,
      );
    }
    if (publishDll !== null) {
      writeFileSync(path.join(tree, "cad-host", "publish", "CadHost.dll"), publishDll);
    }
    return tree;
  }

  const run = (tree: string) =>
    spawnSync(process.execPath, [path.join(tree, "scripts", "prepare-dist.mjs")], {
      cwd: tree,
      encoding: "utf8",
    });

  const trees: string[] = [];
  afterAll(() => {
    for (const tree of trees) rmSync(tree, { recursive: true, force: true });
  });

  it("exits non-zero and names the stale sidecar", () => {
    const tree = makeTree("fresh build", "stale publish");
    trees.push(tree);
    const result = run(tree);
    const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(result.status, out).not.toBe(0);
    expect(out).toMatch(/stale/i);
    // The message has to carry the repair command, because the person reading
    // it may have no .NET SDK and can only do the copy by hand.
    expect(out).toMatch(/cad-host\\bin\\Release\\net8\.0\\win-x64\\CadHost\.dll/);
    expect(out).toMatch(/copy /);
  });

  it("exits zero when the two DLLs match", () => {
    const tree = makeTree("identical", "identical");
    trees.push(tree);
    const result = run(tree);
    expect(result.status, `${result.stdout ?? ""}${result.stderr ?? ""}`).toBe(0);
  });

  it("exits zero when nothing was built at all", () => {
    // A machine that only ever installed a prebuilt sidecar must still be able
    // to cut a release; "no reference" is a warning, not a failure.
    const tree = makeTree(null, null);
    trees.push(tree);
    const result = run(tree);
    expect(result.status, `${result.stdout ?? ""}${result.stderr ?? ""}`).toBe(0);
  });

  it("no longer points at a repair script that does not exist", () => {
    const prepare = readFileSync(
      new URL("./prepare-dist.mjs", import.meta.url),
      "utf8",
    );
    expect(prepare).not.toMatch(/install-cad-engine\.cmd/);
  });
});
