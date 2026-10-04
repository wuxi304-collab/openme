import { describe, expect, it } from "vitest";
import { createUnavailableWriteEngine } from "./cadWriteEngine";
import {
  CAD_SIZE_WARN_BYTES,
  evaluateCadPreflight,
  type CadPreflightInput,
  type CadPreflightResult,
} from "./preflight";

const stubEngine = createUnavailableWriteEngine();

/**
 * The reference sheet from docs/DWG-WRITEBACK-PLAN.md §0:
 * `12.栏杆节点图.dwg`, AC1018, 266,383 bytes, 194 entities, 50 layers, 45 blocks,
 * entity mix Insert 52 / TextEntity 3, and an `0-XREF-A` layer.
 */
const REFERENCE_SHEET: CadPreflightInput = {
  file: { signature: "AC1018", sizeBytes: 266383, readOnly: false },
  document: {
    entityCount: 194,
    layerCount: 50,
    blockCount: 45,
    entityTypes: {
      Insert: 52,
      Line: 48,
      LwPolyline: 36,
      Circle: 25,
      Hatch: 19,
      Arc: 10,
      TextEntity: 3,
      Leader: 1,
    },
    layers: ["0", "0-XREF-A", "A区4-5墙身$0$标注", "WALL"],
  },
  engine: stubEngine,
};

const codes = (result: CadPreflightResult, severity: "blocker" | "warning" | "info") =>
  result.findings.filter((f) => f.severity === severity).map((f) => f.code).sort();

describe("evaluateCadPreflight — the reference sheet", () => {
  const result = evaluateCadPreflight(REFERENCE_SHEET);

  it("refuses to edit, because no engine and no round-trip probe", () => {
    expect(result.editable).toBe(false);
    expect(codes(result, "blocker")).toContain("CAD_PREFLIGHT_ENGINE_UNAVAILABLE");
    expect(codes(result, "blocker")).toContain("CAD_PREFLIGHT_PROBE_NOT_RUN");
  });

  it("reports the version it actually read from the header", () => {
    expect(result.version.code).toBe("AC1018");
    expect(result.version.known).toBe(true);
    expect(result.version.probeVerified).toBe(false);
  });

  it("warns that the labels live in block definitions", () => {
    // 52 Inserts against 3 model-space TextEntity. Editing one block definition
    // changes every occurrence, so the UI must say so rather than presenting the
    // three visible text entities as the whole story.
    expect(result.facts.insertCount).toBe(52);
    expect(result.facts.textEntityCount).toBe(3);
    expect(codes(result, "warning")).toContain("CAD_PREFLIGHT_TEXT_IN_BLOCKS");
  });

  it("warns about xref-dependent layers", () => {
    expect(result.facts.xrefLayerCount).toBe(2);
    expect(codes(result, "warning")).toContain("CAD_PREFLIGHT_XREF_LAYERS");
  });

  it("carries the counts through to the report", () => {
    expect(result.facts).toMatchObject({
      sizeBytes: 266383,
      entityCount: 194,
      layerCount: 50,
      blockCount: 45,
    });
  });
});

describe("evaluateCadPreflight — version gating", () => {
  const base: CadPreflightInput = {
    file: { signature: "AC1018" },
    document: { entityCount: 10, entityTypes: { TextEntity: 10 } },
    engine: stubEngine,
  };

  it("blocks AC1021 as unsupported for writing, with its own code", () => {
    // Reads fine, writes not. Must not be reported as "unknown version".
    const result = evaluateCadPreflight({ ...base, file: { signature: "AC1021" } });
    expect(codes(result, "blocker")).toContain("CAD_PREFLIGHT_VERSION_WRITE_UNSUPPORTED");
    expect(codes(result, "blocker")).not.toContain("CAD_PREFLIGHT_VERSION_UNKNOWN");
    expect(result.version.claimedReadable).toBe(true);
  });

  it("blocks a header it could not read", () => {
    const result = evaluateCadPreflight({ ...base, file: { signature: null } });
    expect(codes(result, "blocker")).toContain("CAD_PREFLIGHT_VERSION_UNREADABLE");
  });

  it("blocks an unrecognised code", () => {
    const result = evaluateCadPreflight({ ...base, file: { signature: "AC9999" } });
    expect(codes(result, "blocker")).toContain("CAD_PREFLIGHT_VERSION_UNKNOWN");
  });

  it("blocks a version the reader cannot open at all", () => {
    const result = evaluateCadPreflight({ ...base, file: { signature: "AC1012" } });
    expect(codes(result, "blocker")).toContain("CAD_PREFLIGHT_VERSION_UNREADABLE_BY_ENGINE");
  });
});

describe("evaluateCadPreflight — file facts", () => {
  const base: CadPreflightInput = {
    file: { signature: "AC1018" },
    document: { entityTypes: { TextEntity: 10 } },
    engine: stubEngine,
  };

  it("blocks a read-only file", () => {
    const result = evaluateCadPreflight({ ...base, file: { signature: "AC1018", readOnly: true } });
    expect(codes(result, "blocker")).toContain("CAD_PREFLIGHT_FILE_READONLY");
  });

  it("warns rather than blocks on a very large drawing", () => {
    const result = evaluateCadPreflight({
      ...base,
      file: { signature: "AC1018", sizeBytes: CAD_SIZE_WARN_BYTES + 1 },
    });
    expect(codes(result, "warning")).toContain("CAD_PREFLIGHT_SIZE_LIMIT");
    expect(codes(result, "blocker")).not.toContain("CAD_PREFLIGHT_SIZE_LIMIT");
  });

  it("does not warn about size just below the threshold", () => {
    const result = evaluateCadPreflight({
      ...base,
      file: { signature: "AC1018", sizeBytes: CAD_SIZE_WARN_BYTES },
    });
    expect(codes(result, "warning")).not.toContain("CAD_PREFLIGHT_SIZE_LIMIT");
  });
});

describe("evaluateCadPreflight — proxy objects", () => {
  it("warns when the engine reports proxy or unknown entities", () => {
    // Real drawings carry SolidWorks / CAXA / GstarCAD extension objects, and
    // whether ACadSharp preserves them is unverified for our corpus.
    const result = evaluateCadPreflight({
      file: { signature: "AC1018" },
      document: { entityTypes: { TextEntity: 20, ProxyEntity: 6, UnknownEntity: 2 } },
      engine: stubEngine,
    });
    expect(codes(result, "warning")).toContain("CAD_PREFLIGHT_PROXY_OBJECTS");
  });

  it("does not warn for a clean entity mix", () => {
    const result = evaluateCadPreflight(REFERENCE_SHEET);
    expect(codes(result, "warning")).not.toContain("CAD_PREFLIGHT_PROXY_OBJECTS");
  });
});

describe("evaluateCadPreflight — block-text heuristic boundaries", () => {
  const withMix = (insert: number, text: number) =>
    evaluateCadPreflight({
      file: { signature: "AC1018" },
      document: { entityTypes: { Insert: insert, TextEntity: text } },
      engine: stubEngine,
    });

  it("flags a low-insert sheet so the warning stays meaningful", () => {
    // 2 inserts / 20 text: nothing here is block-driven, and warning anyway
    // would train users to ignore the warning.
    expect(codes(withMix(2, 20), "warning")).not.toContain("CAD_PREFLIGHT_TEXT_IN_BLOCKS");
  });

  it("flags the reference ratio", () => {
    expect(codes(withMix(52, 3), "warning")).toContain("CAD_PREFLIGHT_TEXT_IN_BLOCKS");
  });

  it("does not flag a balanced drawing", () => {
    expect(codes(withMix(20, 20), "warning")).not.toContain("CAD_PREFLIGHT_TEXT_IN_BLOCKS");
  });
});

describe("evaluateCadPreflight — no input approves an edit today", () => {
  // The module's central claim, asserted as a sweep rather than a handful of
  // examples: with no probe-verified version in existence, no combination of
  // inputs may produce `editable: true`. An earlier draft had an
  // `allowUnverifiedProbe` flag that made this false for a write-capable engine;
  // it was removed instead of defaulted off.
  const engine = {
    capabilities: {
      engine: "acadsharp",
      engineVersion: "3.6.35",
      dumpText: true,
      applyText: true,
      audit: true,
      // Claim every version writable, so only the probe can be holding the line.
      claimedWritableVersions: [
        "AC1014", "AC1015", "AC1018", "AC1021", "AC1024", "AC1027", "AC1032",
      ],
      probeVerified: false,
    },
  };

  const versions = [
    null, "", "AC1018", "AC1014", "AC1021", "AC1024", "AC1032",
    "AC1009", "AC1012", "AC1006", "AC9999", "not-a-version", "AC1018 ",
  ];
  const documents = [
    null,
    {},
    { entityCount: 0 },
    { entityTypes: { Insert: 52, TextEntity: 3 }, layers: ["0-XREF-A"] },
    { entityTypes: { ProxyEntity: 9 } },
  ];
  const fileExtras = [
    {},
    { readOnly: true },
    { readOnly: false, sizeBytes: 10 },
    { readOnly: false, sizeBytes: 10 ** 12 },
  ];

  it("never returns editable while probeVerified is false", () => {
    const approvals: string[] = [];
    for (const signature of versions) {
      for (const document of documents) {
        for (const extra of fileExtras) {
          const result = evaluateCadPreflight({
            file: { signature, ...extra },
            document,
            engine,
          });
          if (result.editable) {
            approvals.push(`${JSON.stringify(signature)} / ${JSON.stringify(document)} / ${JSON.stringify(extra)}`);
          }
        }
      }
    }
    expect(
      approvals,
      `preflight approved these: ${approvals.join(" | ")}`,
    ).toEqual([]);
  });
});

describe("evaluateCadPreflight — the engine's own writable claim", () => {
  const writeCapableEngine = {
    capabilities: {
      engine: "acadsharp",
      engineVersion: "3.6.35",
      dumpText: true,
      applyText: true,
      audit: true,
      claimedWritableVersions: ["AC1018"],
      probeVerified: false,
    },
  };

  it("blocks when the engine claims it cannot write this version", () => {
    // The library matrix says AC1018 is writable; this engine says it is not.
    // The engine's own claim has to be checked separately, or a partially
    // configured engine passes the gate.
    const result = evaluateCadPreflight({
      file: { signature: "AC1018" },
      document: { entityTypes: { TextEntity: 10 } },
      engine: {
        capabilities: {
          ...writeCapableEngine.capabilities,
          claimedWritableVersions: ["AC1024"],
        },
      },
    });
    expect(codes(result, "blocker")).toContain("CAD_PREFLIGHT_ENGINE_CANNOT_WRITE_VERSION");
  });

  it("still blocks on the outstanding probe even for a claimed-writable version", () => {
    const result = evaluateCadPreflight({
      file: { signature: "AC1018" },
      document: { entityTypes: { TextEntity: 10 } },
      engine: writeCapableEngine,
    });
    expect(codes(result, "blocker")).toContain("CAD_PREFLIGHT_PROBE_NOT_RUN");
    expect(result.editable).toBe(false);
  });
});

describe("evaluateCadPreflight — there is no override", () => {
  it("exposes no flag that can wave the probe through", () => {
    // An earlier draft had `allowUnverifiedProbe`. With a write-capable engine it
    // was a complete bypass, which contradicted the module's whole purpose, and
    // it had no production caller. It is gone rather than merely defaulted off.
    const result = evaluateCadPreflight({
      file: { signature: "AC1018" },
      document: { entityTypes: { TextEntity: 10 } },
      engine: createUnavailableWriteEngine(),
      // @ts-expect-error the flag must not exist
      allowUnverifiedProbe: true,
    });
    expect(codes(result, "blocker")).toContain("CAD_PREFLIGHT_ENGINE_UNAVAILABLE");
    expect(result.editable).toBe(false);
  });

  it("reports missing document data as info, not a blocker", () => {
    const result = evaluateCadPreflight({
      file: { signature: "AC1018" },
      document: null,
      engine: stubEngine,
    });
    expect(codes(result, "info")).toContain("CAD_PREFLIGHT_DOCUMENT_UNAVAILABLE");
    expect(codes(result, "blocker")).not.toContain("CAD_PREFLIGHT_DOCUMENT_UNAVAILABLE");
  });
});
