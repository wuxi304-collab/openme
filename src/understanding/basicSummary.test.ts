import { describe, expect, it } from "vitest";
import { buildBasicFileSummary } from "./basicSummary";

describe("buildBasicFileSummary", () => {
  it("builds stable evidence and signals for a known file", () => {
    const summary = buildBasicFileSummary({
      filePath: "C:/work/quote.xlsx",
      fileName: "quote.xlsx",
      category: "office",
      extension: ".xlsx",
      size: 1536,
    });

    expect(summary.fileName).toBe("quote.xlsx");
    expect(summary.category).toBe("office");
    expect(summary.supportLevel).toBe("safe-approximate");
    expect(summary.description).toBe("Office 文档 · 安全近似预览");
    expect(summary.signals).toContain("格式：.xlsx");
    expect(summary.signals).toContain("大小：1.50 KB");
    expect(summary.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "文件名", value: "quote.xlsx" }),
      expect.objectContaining({ label: "文件类型", value: "Office 文档" }),
      expect.objectContaining({ label: "支持等级", value: "安全近似预览" }),
    ]));
  });

  it("adds explicit warnings for design files", () => {
    const summary = buildBasicFileSummary({
      filePath: "C:/work/poster.psd",
      fileName: "poster.psd",
      category: "design",
      size: 20 * 1024 * 1024,
    });

    expect(summary.supportLevel).toBe("semantic-inspection");
    expect(summary.description).toBe("设计源文件 · 语义检查");
    expect(summary.warnings.join("\n")).toContain("不承诺内置高保真预览");
    expect(summary.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "支持等级", severity: "warning" }),
    ]));
  });

  it("adds explicit warnings for packages and disk images", () => {
    const apk = buildBasicFileSummary({ filePath: "app.apk", fileName: "app.apk", category: "package" });
    const iso = buildBasicFileSummary({ filePath: "os.iso", fileName: "os.iso", category: "disk" });

    expect(apk.warnings.join("\n")).toContain("不执行安装器");
    expect(iso.warnings.join("\n")).toContain("不自动挂载");
  });

  it("falls back when extension and size are unknown", () => {
    const summary = buildBasicFileSummary({
      filePath: "C:/work/unknown-file",
      fileName: "unknown-file",
      category: "other",
    });

    expect(summary.supportLevel).toBe("external-open");
    expect(summary.signals).toContain("格式：未知扩展名");
    expect(summary.signals).toContain("大小：未知大小");
  });
});
