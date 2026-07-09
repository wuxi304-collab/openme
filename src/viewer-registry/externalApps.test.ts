import { describe, expect, it } from "vitest";
import { getExternalAppHints, EXTERNAL_APP_HINTS } from "./externalApps";

describe("external app hints", () => {
  it("returns an empty list for fully-supported formats", () => {
    expect(getExternalAppHints(".txt", "code", "text", "B")).toEqual([]);
    expect(getExternalAppHints(".md", "markdown", "builtin", "A")).toEqual([]);
    expect(getExternalAppHints(".pdf", "pdf", "builtin", "A")).toEqual([]);
  });

  it("suggests Photoshop for PSD source", () => {
    const hints = getExternalAppHints(".psd", "design", "external", "D");
    expect(hints.map((h) => h.key)).toContain("photoshop");
    expect(hints.map((h) => h.key)).toContain("photopea");
  });

  it("suggests AutoCAD for DWG drawing", () => {
    const hints = getExternalAppHints(".dwg", "dwg", "semantic", "D");
    expect(hints.map((h) => h.key)).toContain("autocad");
  });

  it("suggests Microsoft Word for legacy DOC", () => {
    const hints = getExternalAppHints(".doc", "office", "external", "D");
    expect(hints.map((h) => h.key)).toContain("microsoftWord");
  });

  it("suggests Calibre for EPUB", () => {
    const hints = getExternalAppHints(".epub", "epub", "builtin", "B");
    expect(hints).toEqual([]);
    const epubHints = getExternalAppHints(".epub", "epub", "semantic", "D");
    expect(epubHints.map((h) => h.key)).toContain("calibre");
  });

  it("suggests DSD-capable player for DSF/DFF", () => {
    const dsf = getExternalAppHints(".dsf", "audio", "external", "D");
    expect(dsf.map((h) => h.key)).toContain("dspeaker");
    const dff = getExternalAppHints(".dff", "audio", "external", "D");
    expect(dff.map((h) => h.key)).toContain("dspeaker");
  });

  it("returns no hints when extension is empty", () => {
    expect(getExternalAppHints("", "other", "external", "D")).toEqual([]);
  });

  it("falls back from main app to open-source alternative", () => {
    const hints = getExternalAppHints(".ai", "design", "external", "D");
    const keys = hints.map((h) => h.key);
    expect(keys.indexOf("illustrator")).toBeLessThan(keys.indexOf("inkscape"));
  });

  it("honours the support level filter (D/E/F only)", () => {
    expect(getExternalAppHints(".psd", "design", "external", "A")).toEqual([]);
    expect(getExternalAppHints(".psd", "design", "external", "B")).toEqual([]);
    expect(getExternalAppHints(".psd", "design", "external", "C")).toEqual([]);
    expect(getExternalAppHints(".psd", "design", "external", "D")).not.toEqual([]);
    expect(getExternalAppHints(".psd", "design", "external", "E")).not.toEqual([]);
    expect(getExternalAppHints(".psd", "design", "external", "F")).not.toEqual([]);
  });

  it("does not duplicate the primary app when its fallback is also listed", () => {
    const hints = getExternalAppHints(".eps", "design", "external", "D");
    const keys = hints.map((h) => h.key);
    expect(keys.filter((k) => k === "inkscape").length).toBeLessThanOrEqual(1);
  });

  it("registry exposes the canonical app keys", () => {
    expect(EXTERNAL_APP_HINTS.photoshop.platforms).toContain("macos");
    expect(EXTERNAL_APP_HINTS.autocad.id).toBe("com.autodesk.AutoCAD");
  });
});
