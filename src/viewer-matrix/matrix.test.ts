import { describe, expect, it } from "vitest";
import { FILE_FORMATS, getFileFormatByPath } from "../file-registry";
import {
  buildViewerMatrix,
  buildViewerMatrixEntry,
  getAdapterLabel,
  getMatrixLevel,
  getViewerMatrixEntryByPath,
  getViewerMatrixStats,
} from "./matrix";

describe("viewer matrix", () => {
  it("classifies text + markdown formats as direct", () => {
    const md = getViewerMatrixEntryByPath("README.md");
    expect(md?.level).toBe("direct");
    expect(md?.needsNativeFidelity).toBe(false);
    expect(md?.adapter).toBe("Markdown Viewer");
  });

  it("classifies CAD formats as semantic (no native preview)", () => {
    const dwg = getViewerMatrixEntryByPath("drawings/shaft.dwg");
    expect(dwg?.level).toBe("semantic");
    expect(dwg?.canPreview).toBe(false);
    expect(dwg?.needsNativeFidelity).toBe(true);
  });

  it("flags restricted-card routes as guarded", () => {
    const reg = buildViewerMatrix().find((entry) => entry.level === "guarded");
    if (reg) {
      expect(reg.routeMode).toBe("restricted-card");
      expect(reg.needsNativeFidelity).toBe(true);
      expect(reg.adapter).toBe("Guarded Route Card");
    }
  });

  it("aggregates stats over the full registry", () => {
    const stats = getViewerMatrixStats();
    expect(stats.total).toBe(FILE_FORMATS.length);
    expect(stats.direct + stats.semantic + stats.card + stats.guarded).toBe(stats.total);
  });

  it("getMatrixLevel maps combinations correctly", () => {
    expect(getMatrixLevel("builtin", true)).toBe("direct");
    expect(getMatrixLevel("text", false)).toBe("direct");
    expect(getMatrixLevel("semantic", false)).toBe("semantic");
    expect(getMatrixLevel("safe-card", false)).toBe("card");
    expect(getMatrixLevel("restricted-card", false)).toBe("guarded");
  });

  it("getAdapterLabel handles all levels", () => {
    expect(getAdapterLabel("direct", "PDF Viewer")).toBe("PDF Viewer");
    expect(getAdapterLabel("semantic", "PDF Viewer")).toBe("Semantic Inspector");
    expect(getAdapterLabel("card", "PDF Viewer")).toBe("Safe Route Card");
    expect(getAdapterLabel("guarded", "PDF Viewer")).toBe("Guarded Route Card");
  });

  it("buildViewerMatrixEntry exposes registry + route fields", () => {
    const format = FILE_FORMATS.find((f) => f.extension === ".pdf")!;
    const entry = buildViewerMatrixEntry(format);
    expect(entry.extension).toBe(".pdf");
    expect(entry.name).toBe("PDF");
    expect(entry.supportLevel).toBe("A");
    expect(entry.canPreview).toBe(true);
    expect(entry.hasExternalFallback).toBe(true);
    expect(entry.reason).toMatch(/PDF/);
  });

  it("returns null for unknown paths", () => {
    expect(getViewerMatrixEntryByPath("nope.unknownformatxyz")).toBeNull();
  });

  it("direct entries never need native fidelity", () => {
    const entries = buildViewerMatrix();
    for (const entry of entries) {
      if (entry.level === "direct") {
        expect(entry.needsNativeFidelity).toBe(false);
      } else {
        expect(entry.needsNativeFidelity).toBe(true);
      }
    }
  });

  it("every entry has a non-empty reason", () => {
    for (const entry of buildViewerMatrix()) {
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  it("format not in registry returns null matrix entry", () => {
    expect(getViewerMatrixEntryByPath("nothing-here.garbage")).toBeNull();
  });

  it("buildViewerMatrix is deterministic across calls", () => {
    const a = buildViewerMatrix();
    const b = buildViewerMatrix();
    expect(a).toEqual(b);
  });
});