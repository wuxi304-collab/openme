import { describe, expect, it } from "vitest";
import { FILE_FORMATS, getFileFormatByExtension } from "../file-registry";
import { buildViewerMatrix, buildViewerMatrixEntry, getViewerMatrixStats } from ".";

function format(extension: string) {
  const result = getFileFormatByExtension(extension);
  if (!result) throw new Error(`Missing registry format: ${extension}`);
  return result;
}

describe("viewer matrix", () => {
  it("builds direct entries for common viewer formats", () => {
    expect(buildViewerMatrixEntry(format(".pdf")).level).toBe("direct");
    expect(buildViewerMatrixEntry(format(".md")).level).toBe("direct");
    expect(buildViewerMatrixEntry(format(".json")).surface).toBe("openme-tab");
  });

  it("covers every registered format", () => {
    const matrix = buildViewerMatrix();
    const stats = getViewerMatrixStats(matrix);

    expect(matrix.length).toBe(FILE_FORMATS.length);
    expect(stats.total).toBe(FILE_FORMATS.length);
    for (const entry of matrix) {
      expect(entry.surface).toBe("openme-tab");
      expect(entry.adapter.length).toBeGreaterThan(3);
      expect(entry.reason.length).toBeGreaterThan(20);
    }
  });
});
