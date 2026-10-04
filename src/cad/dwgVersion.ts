/**
 * DWG file-format version handling.
 *
 * Two claims are kept deliberately apart, because conflating them is exactly how
 * "we can write this file" turns into a corrupted drawing on someone's desk:
 *
 *  - `claimedReadable` / `claimedWritable` come from ACadSharp's published
 *    compatibility matrix, confirmed against upstream's README (see
 *    docs/DWG-WRITEBACK-PLAN.md §3.3). This is a claim by a third party about
 *    its own library.
 *  - `probeVerified` records whether *we* round-tripped that version on our own
 *    corpus (read -> write -> re-read -> audit, plan §4.5). That probe needs a
 *    .NET SDK, so it has not run and is `false` for every version.
 *
 * Nothing in this module may authorise a write on the strength of
 * `claimedWritable` alone. `evaluateCadPreflight` refuses to offer editing while
 * the probe is outstanding, which is the honest state today.
 *
 * The AC10xx codes below are not guesses. The set of codes the shipped
 * ACadSharp 3.6.35 actually knows (AC1002 … AC1032, note: no AC1001) was read
 * out of that package's `ACadSharp.dll` string table — twice, independently:
 * from the build output on a machine that had compiled the sidecar, and from
 * the published 3.6.35 nupkg. The read/write matrix was read out of upstream's
 * README. AutoCAD release names ("AutoCAD 2004" and friends) are intentionally
 * absent: only AC1018 has an in-repo verified mapping, and a half-filled table
 * is worse than none. DWG users say "AC1018".
 */

/** Every version code the shipped ACadSharp build knows about. */
export const KNOWN_DWG_VERSIONS = [
  "AC1002",
  "AC1003",
  "AC1004",
  "AC1006",
  "AC1009",
  "AC1012",
  "AC1014",
  "AC1015",
  "AC1018",
  "AC1021",
  "AC1024",
  "AC1027",
  "AC1032",
] as const;

export type DwgVersionCode = (typeof KNOWN_DWG_VERSIONS)[number];

/** Longest DWG version signature is 6 bytes; anything shorter is not a DWG. */
const SIGNATURE_LENGTH = 6;

export type DwgWriteBlockReason =
  | "not-a-dwg-version"
  | "reader-unsupported"
  | "writer-unsupported"
  | "probe-not-run";

export interface DwgVersionInfo {
  /** The six-character code as found in the file header, e.g. "AC1018". */
  code: string;
  /** Whether the code is one this build has ever heard of. */
  known: boolean;
  /** ACadSharp's published read support. */
  claimedReadable: boolean;
  /** ACadSharp's published write support. */
  claimedWritable: boolean;
  /**
   * False until the round-trip probe (plan §4.5) has run for this code on our
   * own corpus. Always false today. See the module comment for why this is not
   * a formality.
   */
  probeVerified: boolean;
  /** Why a write would be refused, or null when nothing but the probe blocks it. */
  writeBlockedReason: DwgWriteBlockReason | null;
}

/**
 * Upstream's matrix. A code that is absent is treated as "no DWG support",
 * which is what upstream's table says for AC1002/1003/1004/1006 (DXF-era codes
 * it never lists) and for AC1009/AC1012, where both DWG cells are crosses.
 */
const MATRIX: Record<string, { readable: boolean; writable: boolean }> = {
  AC1009: { readable: false, writable: false },
  AC1012: { readable: false, writable: false },
  AC1014: { readable: true, writable: true },
  AC1015: { readable: true, writable: true },
  AC1018: { readable: true, writable: true },
  // AC1021 (AutoCAD 2007) is the read/write hole: the reader handles it, the
  // writer does not. Writing it out as a different version is a conversion the
  // user must consent to explicitly, so we refuse instead.
  AC1021: { readable: true, writable: false },
  AC1024: { readable: true, writable: true },
  AC1027: { readable: true, writable: true },
  AC1032: { readable: true, writable: true },
};

/**
 * Extracts the six-byte version signature from the head of a DWG file.
 *
 * Returns null for anything too short to carry a signature. It deliberately
 * does not consult the file extension: the extension is a claim by whoever
 * named the file, and plan §Step 0 calls for reading the header instead.
 */
export function readDwgVersionSignature(bytes: Uint8Array): string | null {
  if (!bytes || bytes.length < SIGNATURE_LENGTH) return null;
  let code = "";
  for (let index = 0; index < SIGNATURE_LENGTH; index += 1) {
    const char = String.fromCharCode(bytes[index]);
    // Header signatures are printable ASCII; anything else is not a DWG.
    if (char.charCodeAt(0) < 0x20 || char.charCodeAt(0) > 0x7e) return null;
    code += char;
  }
  return code;
}

/** Resolves a version code against the matrix. Unknown codes are not writable. */
export function describeDwgVersion(code: string | null | undefined): DwgVersionInfo {
  const normalized = (code ?? "").trim().toUpperCase();
  const known = (KNOWN_DWG_VERSIONS as readonly string[]).includes(normalized);
  const entry = MATRIX[normalized];
  const claimedReadable = entry?.readable ?? false;
  const claimedWritable = entry?.writable ?? false;

  let writeBlockedReason: DwgWriteBlockReason | null = null;
  if (!known) writeBlockedReason = "not-a-dwg-version";
  else if (!claimedReadable) writeBlockedReason = "reader-unsupported";
  else if (!claimedWritable) writeBlockedReason = "writer-unsupported";
  else writeBlockedReason = "probe-not-run";

  return {
    code: normalized,
    known,
    claimedReadable,
    claimedWritable,
    // Not derived from `claimedWritable` on purpose. See module comment.
    probeVerified: false,
    writeBlockedReason,
  };
}

/** The oldest code we are willing to emit. */
export const MINIMUM_WRITABLE_VERSION = "AC1018";

/**
 * True when `output` is older than `input`. Writing an older version triggers
 * AutoCAD's recover dialog (ACadSharp issue #956), so a save that downgrades
 * the format must be refused outright rather than attempted.
 */
export function isVersionDowngrade(input: string, output: string): boolean {
  return normalizeForOrder(output) < normalizeForOrder(input);
}

function normalizeForOrder(code: string): string {
  return (code ?? "").trim().toUpperCase();
}
