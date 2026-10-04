/**
 * `CadWriteEngine` — the single seam every write-back feature is written
 * against (docs/DWG-WRITEBACK-PLAN.md §4.1).
 *
 * The point of the interface is that "the engine" is a child process and a
 * stdout contract, not a library. Today `cad-host` (ACadSharp) is the only
 * implementation; if fidelity ever proves unacceptable, ODA or RealDWG becomes a
 * packaging change rather than a rewrite. Every UI feature is written against
 * this interface so that swap is possible without touching the features.
 *
 * The unavailable engine is modelled as a first-class object with the same
 * shape rather than as a null/absent engine. That is deliberate: a null engine
 * invites `if (engine) engine.applyText(...)`, which silently turns "we cannot
 * do this yet" into a disabled button nobody can explain. Here every verb
 * returns an explicit refusal carrying a reason the UI can show.
 */

import {
  isVersionDowngrade,
  MINIMUM_WRITABLE_VERSION,
  type DwgVersionInfo,
} from "./dwgVersion";

/** Verbs the engine can support, independently of each other. */
export interface CadWriteEngineCapabilities {
  /** Stable engine identifier, e.g. "acadsharp" or "unavailable". */
  engine: string;
  /** Human-facing version, e.g. "3.6.35". */
  engineVersion?: string;
  /** Handle-authoritative text inventory (plan §4.2). Not view-derived. */
  dumpText: boolean;
  /** Write a modified copy to a new path (plan §4.4). */
  applyText: boolean;
  /** Structural + invariant comparison between two drawings (plan §4.5). */
  audit: boolean;
  /**
   * Version codes this engine claims it can write, from its own published
   * matrix. Not a licence to write — see `DwgVersionInfo.probeVerified`.
   */
  claimedWritableVersions: string[];
  /**
   * Whether the round-trip probe has been run on our corpus for the versions in
   * `claimedWritableVersions`. False today, and the reason editing is refused.
   */
  probeVerified: boolean;
}

export interface CadEngineRefusal {
  ok: false;
  /** Stable code for the UI to map to localized copy. */
  code: string;
  /** Developer-facing detail. Never shown raw to end users. */
  detail: string;
}

export interface CadTextPlanEntry {
  /** Entity address. Only a DWG handle is stable enough to edit by. */
  handle: string;
  before: string;
  after: string;
}

export type CadEngineResult<T> = ({ ok: true } & T) | CadEngineRefusal;

export interface CadWriteEngine {
  readonly capabilities: CadWriteEngineCapabilities;
  /** Short line for the preflight report, e.g. "ACadSharp 3.6.35". */
  describe(): string;
  dumpText(path: string): Promise<CadEngineResult<{ items: unknown[] }>>;
  applyText(
    path: string,
    plan: CadTextPlanEntry[],
    outPath: string,
  ): Promise<CadEngineResult<{ written: string; applied: number; skipped: number }>>;
  audit(a: string, b: string): Promise<CadEngineResult<{ equal: boolean; warnings: string[] }>>;
}

/** Why no write engine is wired up yet. */
export const ENGINE_UNAVAILABLE_REASON =
  "No DWG write engine is wired up. Writing a drawing back is the single " +
  "riskiest operation OpenMe performs, so it stays disabled until the engine " +
  "passes the round-trip probe in docs/DWG-WRITEBACK-PLAN.md §4.5.";

/**
 * The engine used when nothing can safely write. Every mutating verb refuses.
 */
export function createUnavailableWriteEngine(
  reason: string = ENGINE_UNAVAILABLE_REASON,
  capabilities: Partial<CadWriteEngineCapabilities> = {},
): CadWriteEngine {
  const refusal = (code: string): CadEngineRefusal => ({ ok: false, code, detail: reason });
  return {
    capabilities: {
      engine: capabilities.engine ?? "unavailable",
      engineVersion: capabilities.engineVersion,
      dumpText: false,
      applyText: false,
      audit: false,
      claimedWritableVersions: [],
      probeVerified: false,
    },
    describe: () => capabilities.engineVersion ?? "No write engine",
    dumpText: async () => refusal("CAD_ENGINE_DUMP_TEXT_UNAVAILABLE"),
    applyText: async () => refusal("CAD_ENGINE_APPLY_TEXT_UNAVAILABLE"),
    audit: async () => refusal("CAD_ENGINE_AUDIT_UNAVAILABLE"),
  };
}

/**
 * Picks the engine to write against, or the refusing one.
 *
 * Two conditions must hold, and they are deliberately separate:
 *  1. the engine implements all three write verbs, and
 *  2. the round-trip probe has been run for the versions it claims.
 *
 * Failing (2) is today's state. Returning a working-looking engine there would
 * be the exact failure this whole module exists to prevent.
 */
export function selectWriteEngine(
  capabilities: CadWriteEngineCapabilities,
  implementation?: CadWriteEngine,
): CadWriteEngine {
  const implementsWriteVerbs =
    capabilities.dumpText && capabilities.applyText && capabilities.audit;
  if (!implementsWriteVerbs) {
    return createUnavailableWriteEngine(
      `${ENGINE_UNAVAILABLE_REASON} The present engine implements: inspect and render only.`,
      { engine: capabilities.engine, engineVersion: capabilities.engineVersion },
    );
  }
  if (!capabilities.probeVerified) {
    return createUnavailableWriteEngine(
      `${ENGINE_UNAVAILABLE_REASON} The engine exposes write verbs, but no version has been ` +
        `round-trip verified on our corpus yet.`,
      { engine: capabilities.engine, engineVersion: capabilities.engineVersion },
    );
  }
  if (!implementation) {
    return createUnavailableWriteEngine(
      `${ENGINE_UNAVAILABLE_REASON} Capabilities were declared but no implementation was provided.`,
      { engine: capabilities.engine, engineVersion: capabilities.engineVersion },
    );
  }
  return implementation;
}

/**
 * Applies plan §5 Step 1's version rules to a proposed write. Returns null only
 * when the write may proceed.
 *
 * Three separate things are checked, and all three matter:
 *  - the source version has been round-trip verified on our corpus;
 *  - the *target* is a version the engine can actually write at all (an unknown
 *    or unwritable target is refused rather than being waved through on the
 *    strength of the source looking fine);
 *  - the target is not older than the source, and not older than
 *    MINIMUM_WRITABLE_VERSION (ACadSharp #956: writing below AC1018 makes
 *    AutoCAD and DWG TrueView show a recover dialog — note that AC1014/AC1015
 *    are writable per the library matrix yet still below that floor, so the
 *    floor is a genuinely separate rule, not a restatement of claimedWritable).
 */
export function checkWriteVersionInvariants(
  source: DwgVersionInfo,
  target: DwgVersionInfo,
): CadEngineRefusal | null {
  if (!source.probeVerified) {
    return {
      ok: false,
      code: "CAD_WRITE_PROBE_NOT_RUN",
      detail:
        `Refusing to write ${source.code}: the round-trip probe has not been run for this version.`,
    };
  }
  if (!target.known) {
    return {
      ok: false,
      code: "CAD_WRITE_TARGET_VERSION_UNKNOWN",
      detail: `Refusing to write unknown version "${target.code}".`,
    };
  }
  if (!target.claimedWritable) {
    return {
      ok: false,
      code: "CAD_WRITE_TARGET_NOT_WRITABLE",
      detail:
        `Refusing to write ${target.code}: the engine cannot write that version ` +
        `(reason: ${target.writeBlockedReason}). Converting the drawing to a different ` +
        `version is a decision the user has to make explicitly.`,
    };
  }
  if (normalize(target.code) < normalize(MINIMUM_WRITABLE_VERSION)) {
    return {
      ok: false,
      code: "CAD_WRITE_BELOW_MINIMUM_VERSION",
      detail:
        `Refusing to write ${target.code}: outputs below ${MINIMUM_WRITABLE_VERSION} make ` +
        `AutoCAD and DWG TrueView show a recover dialog (ACadSharp #956).`,
    };
  }
  if (isVersionDowngrade(source.code, target.code)) {
    return {
      ok: false,
      code: "CAD_WRITE_VERSION_DOWNGRADE",
      detail:
        `Refusing to write ${target.code} over a ${source.code} source: ` +
        `writing below the source version makes AutoCAD show a recover dialog.`,
    };
  }
  return null;
}

function normalize(code: string): string {
  return (code ?? "").trim().toUpperCase();
}
