/**
 * Preflight: "can this drawing be edited?" (docs/DWG-WRITEBACK-PLAN.md §5,
 * Step 1). Runs before the user is ever offered an edit, and refuses with a
 * specific reason instead of guessing.
 *
 * Everything here is pure and synchronous so the same evaluation can be used by
 * the UI, by a test, and later by a headless batch run. It performs no I/O —
 * the caller supplies the facts.
 *
 * The default verdict is "not editable". That is not pessimism: the round-trip
 * probe has not run, so there is currently no version we can honestly promise to
 * write. A preflight that defaults to "editable" would advertise a capability
 * the product has never demonstrated.
 */

import type { CadWriteEngine } from "./cadWriteEngine";
import { describeDwgVersion, type DwgVersionInfo } from "./dwgVersion";

/** Plan §5 Step 1 size guard. Above this we warn rather than block. */
export const CAD_SIZE_WARN_BYTES = 200 * 1024 * 1024;

/**
 * Insert-vs-text ratio that flags "the labels live in block definitions".
 *
 * The reference sheet in plan §0 has 3 model-space TextEntity against 52 Inserts
 * across 45 blocks, i.e. almost nothing is directly editable and one block edit
 * changes every occurrence. Below this ratio the finding is noise.
 */
export const CAD_BLOCK_TEXT_RATIO = 3;
export const CAD_BLOCK_TEXT_MIN_INSERTS = 5;

/** Entity-type names that indicate a proxy / unmodelled object. */
const PROXY_ENTITY_PATTERN = /proxy|unknown/i;

export type CadPreflightSeverity = "blocker" | "warning" | "info";

export interface CadPreflightFinding {
  /** Stable code; the UI maps it to localized copy. */
  code: string;
  severity: CadPreflightSeverity;
}

export interface CadFileFacts {
  /** Six-byte DWG signature, or null when the header could not be read. */
  signature: string | null;
  sizeBytes?: number;
  readOnly?: boolean;
}

export interface CadDocumentFacts {
  entityCount?: number;
  layerCount?: number;
  blockCount?: number;
  entityTypes?: Record<string, number>;
  layers?: string[];
}

export interface CadPreflightInput {
  file: CadFileFacts;
  document?: CadDocumentFacts | null;
  engine: Pick<CadWriteEngine, "capabilities">;
}

export interface CadPreflightResult {
  editable: boolean;
  version: DwgVersionInfo;
  findings: CadPreflightFinding[];
  facts: {
    sizeBytes?: number;
    entityCount?: number;
    layerCount?: number;
    blockCount?: number;
    insertCount?: number;
    textEntityCount?: number;
    xrefLayerCount?: number;
  };
}

/** Layer names that suggest a linked reference rather than local geometry. */
function isXrefLayer(name: string): boolean {
  return /xref/i.test(name) || name.includes("$0$");
}

export function evaluateCadPreflight(input: CadPreflightInput): CadPreflightResult {
  const findings: CadPreflightFinding[] = [];
  const add = (code: string, severity: CadPreflightSeverity) => findings.push({ code, severity });

  const version = describeDwgVersion(input.file.signature);

  // --- Engine availability -------------------------------------------------
  const caps = input.engine.capabilities;
  const engineCanWrite = caps.dumpText && caps.applyText && caps.audit;
  if (!engineCanWrite) add("CAD_PREFLIGHT_ENGINE_UNAVAILABLE", "blocker");

  // --- Version -------------------------------------------------------------
  if (!input.file.signature) {
    add("CAD_PREFLIGHT_VERSION_UNREADABLE", "blocker");
  } else if (!version.known) {
    add("CAD_PREFLIGHT_VERSION_UNKNOWN", "blocker");
  } else if (!version.claimedReadable) {
    add("CAD_PREFLIGHT_VERSION_UNREADABLE_BY_ENGINE", "blocker");
  } else if (!version.claimedWritable) {
    // AC1021 and friends: readable, not writable. Refusing beats silently
    // converting the user's 2007 drawing to a different version.
    add("CAD_PREFLIGHT_VERSION_WRITE_UNSUPPORTED", "blocker");
  } else {
    // These two are independent of each other and of the checks above, so they
    // are not an else-if chain: an engine that does not claim this version
    // *and* an unproven probe are separate reasons, and reporting only the
    // first would hide the dominant one.
    if (!caps.claimedWritableVersions.includes(version.code)) {
      // The engine's own list is a separate claim from the library matrix. An
      // engine that declares it can write nothing must not pass the gate just
      // because the version is writable in the abstract.
      add("CAD_PREFLIGHT_ENGINE_CANNOT_WRITE_VERSION", "blocker");
    }
    if (!version.probeVerified) {
      // No override, no escape hatch. Until the round-trip probe has run for
      // this version on our corpus, nothing is writable — that is the entire
      // point of building this gate before the engine exists.
      add("CAD_PREFLIGHT_PROBE_NOT_RUN", "blocker");
    }
  }

  // --- File facts ----------------------------------------------------------
  if (input.file.readOnly) add("CAD_PREFLIGHT_FILE_READONLY", "blocker");
  if (
    typeof input.file.sizeBytes === "number" &&
    input.file.sizeBytes > CAD_SIZE_WARN_BYTES
  ) {
    add("CAD_PREFLIGHT_SIZE_LIMIT", "warning");
  }

  // --- Document facts ------------------------------------------------------
  const document = input.document ?? null;
  const entityTypes = document?.entityTypes ?? {};
  // Look entity types up case-insensitively: the sidecar reports CLR type names
  // ("Insert", "TextEntity"), but a hand-written fixture or a future engine may
  // differ in casing and the heuristics below should not care.
  const byLowerName = new Map(
    Object.entries(entityTypes).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const insertCount = byLowerName.get("insert") ?? 0;
  const textEntityCount = byLowerName.get("textentity") ?? 0;
  const proxyCount = Object.entries(entityTypes)
    .filter(([key]) => PROXY_ENTITY_PATTERN.test(key))
    .reduce((total, [, count]) => total + (count ?? 0), 0);
  const layers = document?.layers ?? [];
  const xrefLayerCount = layers.filter(isXrefLayer).length;

  if (!document) {
    add("CAD_PREFLIGHT_DOCUMENT_UNAVAILABLE", "info");
  } else {
    if (proxyCount > 0) {
      add("CAD_PREFLIGHT_PROXY_OBJECTS", "warning");
    }
    if (
      insertCount >= CAD_BLOCK_TEXT_MIN_INSERTS &&
      insertCount > textEntityCount * CAD_BLOCK_TEXT_RATIO
    ) {
      add("CAD_PREFLIGHT_TEXT_IN_BLOCKS", "warning");
    }
    if (xrefLayerCount > 0) add("CAD_PREFLIGHT_XREF_LAYERS", "warning");
  }

  return {
    editable: !findings.some((finding) => finding.severity === "blocker"),
    version,
    findings,
    facts: {
      sizeBytes: input.file.sizeBytes,
      entityCount: document?.entityCount,
      layerCount: document?.layerCount,
      blockCount: document?.blockCount,
      insertCount: document ? insertCount : undefined,
      textEntityCount: document ? textEntityCount : undefined,
      xrefLayerCount: document ? xrefLayerCount : undefined,
    },
  };
}
