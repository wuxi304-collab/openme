import { describe, expect, it } from "vitest";
import { FILE_FORMATS } from "../file-registry";
import { buildViewerMatrix, getViewerMatrixStats } from ".";

describe("viewer matrix", () => {
  it("covers every registered format", () => {
    const matrix = buildViewerMatrix();
    const stats = getViewerMatrixStats(matrix);

    expect(matrix.length).toBe(FILE_FORMATS.length);
    expect(stats.total).toBe(FILE_FORMATS.length);
    expect(stats.direct + stats.semantic + stats.card + stats.guarded).toBe(stats.total);

    for (const entry of matrix) {
      expect(entry.surface).toBe("openme-tab");
      expect(entry.adapter.length).toBeGreaterThan(3);
      expect(entry.reason.length).toBeGreaterThan(20);
    }
  });
});
