import { describe, expect, it } from "vitest";
import { extractMetadata } from "../metadata";
import { buildFileBrief } from ".";

describe("file brief layer", () => {
  it("builds a readable brief for built-in preview formats", () => {
    const brief = buildFileBrief(extractMetadata({ filePath: "C:/work/spec.pdf", fileName: "spec.pdf", size: 4096 }));

    expect(brief.title).toBe("spec.pdf");
    expect(brief.subtitle).toContain("pdf");
    expect(brief.openStrategy).toBe("builtin");
    expect(brief.actions[0].label).toBe("Open preview");
    expect(brief.signals).toContain("viewer:pdf-viewer");
  });

  it("keeps restricted files explicit", () => {
    const brief = buildFileBrief(extractMetadata({ filePath: "C:/downloads/setup.exe", fileName: "setup.exe" }));

    expect(brief.openStrategy).toBe("restricted");
    expect(brief.riskLevel).toBe("high");
    expect(brief.actions[0].label).toBe("Review boundary");
    expect(brief.warnings.some((warning) => warning.includes("active content"))).toBe(true);
  });

  it("creates text-focused actions for text strategy", () => {
    const brief = buildFileBrief(extractMetadata({ filePath: "C:/work/readme.md", fileName: "readme.md", textSample: "# Title\nBody" }));

    expect(brief.openStrategy).toBe("text");
    expect(brief.actions[0].label).toBe("Open text preview");
    expect(brief.signals).toContain("lines:2");
  });

  it("handles unknown formats as external handoff", () => {
    const brief = buildFileBrief(extractMetadata({ filePath: "C:/work/file.unknownx", fileName: "file.unknownx" }));

    expect(brief.supportLevel).toBe("F");
    expect(brief.openStrategy).toBe("external");
    expect(brief.actions[0].label).toBe("Open externally");
    expect(brief.warnings.some((warning) => warning.includes("no registered support"))).toBe(true);
  });
});
