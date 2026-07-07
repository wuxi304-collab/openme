import { describe, expect, it } from "vitest";
import { FILE_FORMATS, getFileFormatByExtension } from "../file-registry";
import { getRoutableFormatCount, getViewerRouteByPath, getViewerRouteForFormat, VIEWER_REGISTRY } from ".";

function format(extension: string) {
  const result = getFileFormatByExtension(extension);
  if (!result) throw new Error(`Missing registry format: ${extension}`);
  return result;
}

describe("viewer route registry", () => {
  it("registers viewer route entries", () => {
    expect(VIEWER_REGISTRY.length).toBeGreaterThan(10);
    expect(VIEWER_REGISTRY.some((viewer) => viewer.id === "pdf-viewer")).toBe(true);
    expect(VIEWER_REGISTRY.some((viewer) => viewer.id === "route-only")).toBe(true);
  });

  it("routes common built-in and text formats", () => {
    expect(getViewerRouteForFormat(format(".pdf")).viewerId).toBe("pdf-viewer");
    expect(getViewerRouteForFormat(format(".pdf")).mode).toBe("builtin");
    expect(getViewerRouteForFormat(format(".md")).viewerId).toBe("markdown-viewer");
    expect(getViewerRouteForFormat(format(".md")).canEdit).toBe(true);
  });

  it("routes professional and high-risk families with honest boundaries", () => {
    const cad = getViewerRouteForFormat(format(".dwg"));
    const installer = getViewerRouteForFormat(format(".exe"));
    const disk = getViewerRouteForFormat(format(".iso"));

    expect(cad.viewerId).toBe("cad-viewer");
    expect(cad.canPreview).toBe(false);
    expect(installer.mode).toBe("restricted");
    expect(installer.canPreview).toBe(false);
    expect(disk.mode).toBe("restricted");
    expect(disk.reason).toContain("will not");
  });

  it("routes unknown paths conservatively", () => {
    const route = getViewerRouteByPath("C:/work/file.unknownx");

    expect(route.viewerId).toBe("route-only");
    expect(route.mode).toBe("external");
    expect(route.canPreview).toBe(false);
  });

  it("provides a route for every registered format", () => {
    expect(getRoutableFormatCount(FILE_FORMATS)).toBe(FILE_FORMATS.length);

    for (const entry of FILE_FORMATS) {
      const route = getViewerRouteForFormat(entry);
      expect(route.viewerId.length).toBeGreaterThan(0);
      expect(route.reason.length).toBeGreaterThan(20);
      expect(route.boundary.length).toBeGreaterThan(10);
      if (route.mode === "restricted") expect(route.canPreview).toBe(false);
    }
  });
});
