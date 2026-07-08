import { describe, expect, it } from "vitest";
import { buildBasicFileSummary } from "./basicSummary";
import type { Translator } from "../i18n";

const zh: Record<string, string> = {
  categoryCode: "代码文件",
  categoryMarkdown: "Markdown 文档",
  categoryJson: "JSON 数据",
  categoryCsv: "CSV 数据",
  categoryImage: "图片",
  categorySvg: "SVG 矢量图",
  categoryPdf: "PDF 文档",
  categoryOffice: "Office 文档",
  categoryArchive: "压缩包",
  categoryEpub: "EPUB 电子书",
  categoryAudio: "音频",
  categoryVideo: "视频",
  categoryFont: "字体文件",
  categoryCad: "CAD 通用图纸",
  categoryDwg: "DWG 图纸",
  categoryDesign: "设计源文件",
  categoryPackage: "安装包",
  categoryDisk: "磁盘镜像",
  categoryOther: "其他文件",
  supportFullBuiltIn: "完整内置浏览",
  supportHighFidelity: "高保真浏览",
  supportSafeApproximate: "安全近似预览",
  supportSemanticInspection: "语义检查",
  supportExternalOpen: "外部打开",
  supportExperimental: "实验性",
  signalFormat: "格式：{ext}",
  signalSize: "大小：{size}",
  signalSupportLevel: "支持等级：{level}",
  evidenceFileName: "文件名",
  evidenceFileType: "文件类型",
  evidenceSupportLevel: "支持等级",
  evidenceFileSize: "文件大小",
  unknownExtension: "未知扩展名",
  unknownSize: "未知大小",
  warningDwg: "DWG 预览由 ACadSharp 输出，不是 AutoCAD 原生显示；不要把画面当作最终光栅。",
  warningCad: "CAD 文件当前只能语义检查；如需 AutoCAD 级保真，请用系统已安装的 TrueView 或原生引擎。",
  warningMedia: "音频 / 视频实际解码能力取决于当前 Electron 自带的编解码器。",
  warningOffice: "Office 文档经过格式转换，复杂样式和浮动对象可能丢失。",
  warningSvg: "SVG 预览不执行脚本，复杂滤镜和动画可能降级。",
  warningDesign: "设计源文件（PSD/AI 等）不承诺内置高保真预览。",
  warningPackage: "安装包仅做元数据检查，OpenMe 不执行安装器。",
  warningDisk: "磁盘镜像仅做元数据检查，OpenMe 不自动挂载。",
  warningArchive: "压缩包在解压前只读取条目表，复杂加密格式可能不完整。",
};

const t: Translator = (key, params) => {
  const template = zh[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
};

describe("buildBasicFileSummary", () => {
  it("builds stable evidence and signals for a known file", () => {
    const summary = buildBasicFileSummary(
      {
        filePath: "C:/work/quote.xlsx",
        fileName: "quote.xlsx",
        category: "office",
        extension: ".xlsx",
        size: 1536,
      },
      t,
    );

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
    const summary = buildBasicFileSummary(
      {
        filePath: "C:/work/poster.psd",
        fileName: "poster.psd",
        category: "design",
        size: 20 * 1024 * 1024,
      },
      t,
    );

    expect(summary.supportLevel).toBe("semantic-inspection");
    expect(summary.description).toBe("设计源文件 · 语义检查");
    expect(summary.warnings.join("\n")).toContain("不承诺内置高保真预览");
    expect(summary.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "支持等级", severity: "warning" }),
    ]));
  });

  it("adds explicit warnings for packages and disk images", () => {
    const apk = buildBasicFileSummary({ filePath: "app.apk", fileName: "app.apk", category: "package" }, t);
    const iso = buildBasicFileSummary({ filePath: "os.iso", fileName: "os.iso", category: "disk" }, t);

    expect(apk.warnings.join("\n")).toContain("不执行安装器");
    expect(iso.warnings.join("\n")).toContain("不自动挂载");
  });

  it("falls back when extension and size are unknown", () => {
    const summary = buildBasicFileSummary(
      {
        filePath: "C:/work/unknown-file",
        fileName: "unknown-file",
        category: "other",
      },
      t,
    );

    expect(summary.supportLevel).toBe("external-open");
    expect(summary.signals).toContain("格式：未知扩展名");
    expect(summary.signals).toContain("大小：未知大小");
  });
});
