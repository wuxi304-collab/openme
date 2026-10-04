import { describe, expect, it } from "vitest";
import {
  checkWriteVersionInvariants,
  createUnavailableWriteEngine,
  selectWriteEngine,
  ENGINE_UNAVAILABLE_REASON,
  type CadWriteEngine,
  type CadWriteEngineCapabilities,
} from "./cadWriteEngine";
import { describeDwgVersion } from "./dwgVersion";

const workingEngine: CadWriteEngine = {
  capabilities: {
    engine: "acadsharp",
    engineVersion: "3.6.35",
    dumpText: true,
    applyText: true,
    audit: true,
    claimedWritableVersions: ["AC1018", "AC1024"],
    probeVerified: true,
  },
  describe: () => "ACadSharp 3.6.35",
  dumpText: async () => ({ ok: true, items: [] }),
  applyText: async () => ({ ok: true, written: "out.dwg", applied: 1, skipped: 0 }),
  audit: async () => ({ ok: true, equal: true, warnings: [] }),
};

const caps = (over: Partial<CadWriteEngineCapabilities> = {}): CadWriteEngineCapabilities => ({
  engine: "acadsharp",
  dumpText: true,
  applyText: true,
  audit: true,
  claimedWritableVersions: ["AC1018"],
  probeVerified: true,
  ...over,
});

describe("createUnavailableWriteEngine", () => {
  it("refuses every verb rather than resolving successfully", async () => {
    const engine = createUnavailableWriteEngine();
    // The whole point of the stub: no call may look like it worked.
    for (const call of [
      engine.dumpText("a.dwg"),
      engine.applyText("a.dwg", [], "b.dwg"),
      engine.audit("a.dwg", "b.dwg"),
    ]) {
      const result = await call;
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toMatch(/^CAD_ENGINE_/);
        expect(result.detail).toBe(ENGINE_UNAVAILABLE_REASON);
      }
    }
  });

  it("declares no write capabilities even when an engine name is supplied", () => {
    // Passing the real engine's name must not make the stub look writable.
    const engine = createUnavailableWriteEngine(ENGINE_UNAVAILABLE_REASON, {
      engine: "acadsharp",
      engineVersion: "3.6.35",
    });
    expect(engine.capabilities.dumpText).toBe(false);
    expect(engine.capabilities.applyText).toBe(false);
    expect(engine.capabilities.audit).toBe(false);
    expect(engine.capabilities.probeVerified).toBe(false);
    expect(engine.capabilities.claimedWritableVersions).toEqual([]);
  });
});

describe("selectWriteEngine", () => {
  it("returns the implementation only when every condition holds", () => {
    expect(selectWriteEngine(caps(), workingEngine)).toBe(workingEngine);
  });

  it("refuses when the engine lacks any write verb", async () => {
    for (const missing of ["dumpText", "applyText", "audit"] as const) {
      const engine = selectWriteEngine(caps({ [missing]: false }), workingEngine);
      const result = await engine.applyText("a.dwg", [], "b.dwg");
      expect(result.ok, missing).toBe(false);
    }
  });

  it("refuses while the round-trip probe is unverified, even with a full implementation", async () => {
    // This is today's state, and the case that matters most: a working-looking
    // engine that has never been proven on our corpus must not be handed out.
    const engine = selectWriteEngine(caps({ probeVerified: false }), workingEngine);
    const result = await engine.applyText("a.dwg", [], "b.dwg");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("CAD_ENGINE_APPLY_TEXT_UNAVAILABLE");
      expect(result.detail).toMatch(/no version has been round-trip verified/);
    }
  });

  it("refuses when capabilities are declared but no implementation is supplied", async () => {
    const engine = selectWriteEngine(caps());
    expect((await engine.dumpText("a.dwg")).ok).toBe(false);
  });
});

describe("checkWriteVersionInvariants", () => {
  it("refuses to write while the source version is unverified", () => {
    const source = describeDwgVersion("AC1018");
    const refusal = checkWriteVersionInvariants(source, describeDwgVersion("AC1018"));
    expect(refusal).not.toBeNull();
    expect(refusal?.code).toBe("CAD_WRITE_PROBE_NOT_RUN");
  });

  it("refuses a downgrade that stays above the minimum", () => {
    // ACadSharp #956: writing below the source version makes AutoCAD and DWG
    // TrueView show a recover dialog. AC1024 -> AC1018 stays above the
    // AC1018 floor, so this isolates the downgrade rule from the minimum rule.
    const source = { ...describeDwgVersion("AC1032"), probeVerified: true };
    const refusal = checkWriteVersionInvariants(source, describeDwgVersion("AC1024"));
    expect(refusal?.code).toBe("CAD_WRITE_VERSION_DOWNGRADE");
  });

  it("allows a same-version write once the source is verified", () => {
    const source = { ...describeDwgVersion("AC1018"), probeVerified: true };
    expect(checkWriteVersionInvariants(source, describeDwgVersion("AC1018"))).toBeNull();
  });

  it("allows writing forward to a newer writable version", () => {
    const source = { ...describeDwgVersion("AC1018"), probeVerified: true };
    expect(checkWriteVersionInvariants(source, describeDwgVersion("AC1024"))).toBeNull();
  });

  it("refuses an unknown target version", () => {
    // Previously this returned null: the check only compared order, so a target
    // the engine cannot produce at all was waved through on the strength of the
    // source looking fine. It is a hole that only opened once the probe landed.
    const source = { ...describeDwgVersion("AC1018"), probeVerified: true };
    for (const target of ["AC9999", "AC1035", "ZZZZZZ"]) {
      const refusal = checkWriteVersionInvariants(source, describeDwgVersion(target));
      expect(refusal?.code, target).toBe("CAD_WRITE_TARGET_VERSION_UNKNOWN");
    }
  });

  it("refuses a target the engine cannot write", () => {
    // AC1021 reads but does not write.
    const source = { ...describeDwgVersion("AC1024"), probeVerified: true };
    const refusal = checkWriteVersionInvariants(source, describeDwgVersion("AC1021"));
    expect(refusal?.code).toBe("CAD_WRITE_TARGET_NOT_WRITABLE");
  });

  it("refuses a writable version that is still below the minimum", () => {
    // AC1014/AC1015 are writable per the library matrix, yet below AC1018 —
    // writing them triggers AutoCAD's recover dialog. So the minimum-version
    // floor is a separate rule, not a restatement of claimedWritable.
    const source = { ...describeDwgVersion("AC1018"), probeVerified: true };
    const target = describeDwgVersion("AC1015");
    expect(target.claimedWritable).toBe(true);
    expect(checkWriteVersionInvariants(source, target)?.code).toBe(
      "CAD_WRITE_BELOW_MINIMUM_VERSION",
    );
  });

  it("checks the probe before anything else", () => {
    // Ordering matters: a stale probe must be the reported reason, not a
    // downstream version complaint the user cannot act on.
    const refusal = checkWriteVersionInvariants(
      describeDwgVersion("AC1018"),
      describeDwgVersion("ZZZZZZ"),
    );
    expect(refusal?.code).toBe("CAD_WRITE_PROBE_NOT_RUN");
  });
});
