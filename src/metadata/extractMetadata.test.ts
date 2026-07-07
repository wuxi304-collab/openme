import { describe, expect, it } from "vitest";
import { deriveExtension, extractMetadata, formatBytes } from ".";

describe("metadata engine", () => {
  it("extracts registry-backed metadata for previewable files", () => {
    const result = extractMetadata({
      filePath: "C:/work/spec.pdf",
      fileName: "spec.pdf",
      size: 2048,
      modifiedAt: "2026-07-07T10:00:00Z",
    });

    expect(result.extension).toBe(".pdf");
    expect(result.category).toBe("pdf");
    expect(result.preferredViewer).toBe("pdf-viewer");
    expect(result.openStrategy).toBe("builtin");
    expect(result.riskLevel).toBe("low");
    expect(result.evidence.some((item) => item.label === "Registered format")).toBe(true);
  });

  it("keeps high-risk routed formats explicit", () => {
    const result = extractMetadata({
      filePath: "C:/downloads/setup.exe",
      fileName: "setup.exe",
      size: 1024,
    });

    expect(result.category).toBe("package");
    expect(result.openStrategy).toBe("restricted");
    expect(result.riskLevel).toBe("high");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("returns text stats when a text sample is available", () => {
    const result = extractMetadata({
      filePath: "C:/work/readme.md",
      fileName: "readme.md",
      textSample: "# OpenMe\n\nlocal-first",
    });

    expect(result.encoding).toBe("text");
    expect(result.lineCount).toBe(3);
    expect(result.characterCount).toBeGreaterThan(10);
  });

  it("handles unknown formats conservatively", () => {
    const result = extractMetadata({
      filePath: "C:/work/blob.unknownx",
      fileName: "blob.unknownx",
    });

    expect(result.category).toBe("other");
    expect(result.supportLevel).toBe("F");
    expect(result.preferredViewer).toBe("route-only");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("derives compound extensions and readable byte sizes", () => {
    expect(deriveExtension("archive.tar.gz")).toBe(".tar.gz");
    expect(deriveExtension("scan.nii.gz")).toBe(".nii.gz");
    expect(formatBytes(1536)).toBe("1.50 KB");
  });
});
