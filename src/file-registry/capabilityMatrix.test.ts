import { describe, expect, it } from "vitest";
import { FILE_FORMATS } from ".";
import { buildCapabilityMatrix, getCapabilityCoverage, getPreviewableFormatCount, getRouteOnlyFormatCount } from "./capabilityMatrix";

describe("capability matrix", () => {
  it("summarizes registry categories", () => {
    const matrix = buildCapabilityMatrix();
    const total = matrix.reduce((sum, row) => sum + row.total, 0);

    expect(total).toBe(FILE_FORMATS.length);
    expect(matrix.length).toBeGreaterThan(10);
    expect(matrix[0].total).toBeGreaterThan(20);
  });

  it("computes capability coverage", () => {
    const codeRow = buildCapabilityMatrix().find((row) => row.category === "code");

    expect(codeRow).toBeDefined();
    expect(getCapabilityCoverage(codeRow!, "detect")).toBe(1);
    expect(getCapabilityCoverage(codeRow!, "external-open")).toBe(1);
  });

  it("separates previewable and route-only formats", () => {
    expect(getPreviewableFormatCount()).toBeGreaterThan(20);
    expect(getRouteOnlyFormatCount()).toBeGreaterThan(50);
    expect(getPreviewableFormatCount() + getRouteOnlyFormatCount()).toBeLessThanOrEqual(FILE_FORMATS.length);
  });
});
