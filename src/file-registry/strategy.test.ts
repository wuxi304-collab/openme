import { describe, expect, it } from "vitest";
import { FILE_FORMATS, getFileFormatByExtension } from ".";
import { deriveOpenStrategy, derivePreferredViewer, deriveRiskLevel, getRegistryStrategy } from "./strategy";

function format(extension: string) {
  const result = getFileFormatByExtension(extension);
  if (!result) throw new Error(`Missing registry format: ${extension}`);
  return result;
}

describe("registry strategy", () => {
  it("derives viewer and strategy for common previewable formats", () => {
    expect(derivePreferredViewer(format(".pdf"))).toBe("pdf-viewer");
    expect(derivePreferredViewer(format(".png"))).toBe("image-viewer");
    expect(derivePreferredViewer(format(".zip"))).toBe("archive-viewer");
    expect(deriveOpenStrategy(format(".pdf"))).toBe("builtin");
  });

  it("keeps text-like formats on text strategy", () => {
    expect(deriveOpenStrategy(format(".md"))).toBe("text");
    expect(deriveOpenStrategy(format(".json"))).toBe("text");
    expect(deriveRiskLevel(format(".json"))).toBe("low");
  });

  it("marks packages and disk images as restricted high-risk routes", () => {
    expect(deriveOpenStrategy(format(".exe"))).toBe("restricted");
    expect(deriveRiskLevel(format(".exe"))).toBe("high");
    expect(deriveOpenStrategy(format(".iso"))).toBe("restricted");
    expect(deriveRiskLevel(format(".iso"))).toBe("high");
  });

  it("returns a complete strategy for every registered format", () => {
    for (const entry of FILE_FORMATS) {
      const strategy = getRegistryStrategy(entry);
      expect(strategy.preferredViewer.length).toBeGreaterThan(0);
      expect(strategy.openStrategy.length).toBeGreaterThan(0);
      expect(strategy.riskLevel.length).toBeGreaterThan(0);
      expect(strategy.tags.length).toBeGreaterThan(1);
    }
  });
});
