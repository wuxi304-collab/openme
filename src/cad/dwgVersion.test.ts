import { describe, expect, it } from "vitest";
import {
  describeDwgVersion,
  isVersionDowngrade,
  KNOWN_DWG_VERSIONS,
  MINIMUM_WRITABLE_VERSION,
  readDwgVersionSignature,
} from "./dwgVersion";

const ascii = (text: string) => new Uint8Array([...text].map((c) => c.charCodeAt(0)));

describe("readDwgVersionSignature", () => {
  it("reads the six-byte signature from a real AC1018 header", () => {
    // The reference sheet in the write-back plan is AC1018 (AutoCAD 2004);
    // its first six bytes are literally "AC1018".
    expect(readDwgVersionSignature(ascii("AC1018rest-of-file"))).toBe("AC1018");
  });

  it("returns null for a buffer too short to hold a signature", () => {
    expect(readDwgVersionSignature(ascii("AC10"))).toBeNull();
    expect(readDwgVersionSignature(new Uint8Array(0))).toBeNull();
  });

  it("returns null for non-printable bytes instead of guessing", () => {
    // A binary blob whose first six bytes happen to be "AC1018" is still not a
    // DWG. Refusing here is what stops a wrong version reaching the preflight.
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
    expect(readDwgVersionSignature(bytes)).toBeNull();
  });

  it("returns null when the signature contains a control character", () => {
    const bytes = ascii("AC10\t8");
    expect(readDwgVersionSignature(bytes)).toBeNull();
  });
});

describe("describeDwgVersion", () => {
  it("knows exactly the codes ACadSharp 3.6.35 contains", () => {
    // Pinned against the AC10xx tokens in that package's ACadSharp.dll string
    // table (AC1002 … AC1032). This asserts the list is stable and complete;
    // it does not re-scan a DLL, so treat it as a tripwire for an accidental
    // edit, not as the evidence the list is right — that evidence is recorded
    // in the module comment.
    // AC1001 must NOT appear: it is not a real DWG version code.
    expect([...KNOWN_DWG_VERSIONS]).toEqual([
      "AC1002", "AC1003", "AC1004", "AC1006", "AC1009", "AC1012",
      "AC1014", "AC1015", "AC1018", "AC1021", "AC1024", "AC1027", "AC1032",
    ]);
    expect(KNOWN_DWG_VERSIONS).not.toContain("AC1001");
  });

  it("treats AC1018 as readable and writable per upstream's matrix", () => {
    const info = describeDwgVersion("AC1018");
    expect(info.known).toBe(true);
    expect(info.claimedReadable).toBe(true);
    expect(info.claimedWritable).toBe(true);
  });

  it("blocks AC1021 even though it reads, because the writer does not", () => {
    // Upstream's table has a check in DwgReader and a cross in DwgWriter for
    // AC1021 (AutoCAD 2007). This is the single most important entry in the
    // table: silently converting a 2007 drawing to another version is not ours
    // to do without asking.
    const info = describeDwgVersion("AC1021");
    expect(info.claimedReadable).toBe(true);
    expect(info.claimedWritable).toBe(false);
    expect(info.writeBlockedReason).toBe("writer-unsupported");
  });

  it("blocks AC1009 and AC1012 at the reader", () => {
    for (const code of ["AC1009", "AC1012"]) {
      const info = describeDwgVersion(code);
      expect(info.known).toBe(true);
      expect(info.claimedReadable).toBe(false);
      expect(info.writeBlockedReason).toBe("reader-unsupported");
    }
  });

  it("blocks the DXF-era codes the matrix never lists", () => {
    for (const code of ["AC1002", "AC1003", "AC1004", "AC1006"]) {
      const info = describeDwgVersion(code);
      expect(info.known).toBe(true);
      expect(info.claimedWritable).toBe(false);
      expect(info.writeBlockedReason).toBe("reader-unsupported");
    }
  });

  it("refuses an unknown code rather than defaulting to writable", () => {
    const info = describeDwgVersion("AC9999");
    expect(info.known).toBe(false);
    expect(info.claimedReadable).toBe(false);
    expect(info.claimedWritable).toBe(false);
    expect(info.writeBlockedReason).toBe("not-a-dwg-version");
  });

  it("never reports a version as probe-verified", () => {
    // The round-trip probe (plan §4.5) needs a .NET SDK and has not run. This
    // assertion is the reason the preflight refuses by default: if someone
    // "fixes" a failing preflight by flipping probeVerified to true without
    // running the probe, this fails.
    for (const code of KNOWN_DWG_VERSIONS) {
      expect(describeDwgVersion(code).probeVerified, code).toBe(false);
    }
  });

  it("is case and whitespace insensitive", () => {
    expect(describeDwgVersion("  ac1018 ").code).toBe("AC1018");
    expect(describeDwgVersion("ac1018").claimedWritable).toBe(true);
  });

  it("handles a missing signature", () => {
    expect(describeDwgVersion(null).known).toBe(false);
    expect(describeDwgVersion(undefined).writeBlockedReason).toBe("not-a-dwg-version");
  });
});

describe("isVersionDowngrade", () => {
  it("detects writing an older version than the source", () => {
    // ACadSharp #956: below AC1018 AutoCAD shows a recover dialog.
    expect(isVersionDowngrade("AC1018", "AC1014")).toBe(true);
    expect(isVersionDowngrade("AC1024", "AC1018")).toBe(true);
  });

  it("does not flag same-version or newer writes", () => {
    expect(isVersionDowngrade("AC1018", "AC1018")).toBe(false);
    expect(isVersionDowngrade("AC1014", "AC1018")).toBe(false);
  });

  it("states the oldest version we are willing to emit", () => {
    expect(MINIMUM_WRITABLE_VERSION).toBe("AC1018");
  });
});
