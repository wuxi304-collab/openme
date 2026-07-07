import { describe, expect, it } from "vitest";
import { FILE_FORMATS, getFileFormatByExtension } from "../file-registry";
import { getRoutableFormatCount, getViewerRouteByPath, getViewerRouteForFormat, VIEWER_REGISTRY } from ".";

function format(extension: string) {
  const result = getFileFormatByExtension(extension);
  if (!result) throw new Error(`Missing registry format: ${extension}`);
  return result;
}

describe("viewer route registry", () => {
  it("registers OpenMe direct-open route entries", () => {
    expect(VIEWER_REGISTRY.length).toBeGreaterThan(10);
    expect(VIEWER_REGISTRY.some((viewer) => viewer.id === "pdf-viewer")).toBe(true);
    expect(VIEWER_REGISTRY.some((viewer) => viewer.id === "route-only")).toBe(true);
  });

  it("routes common built-in and text formats inside OpenMe", () => {
    const pdf = getViewerRouteForFormat(format(".pdf"));
    const markdown = getViewerRouteForFormat(format(".md"));

    expect(pdf.viewerId).toBe("pdf-viewer");
    expect(pdf.mode).toBe("builtin");
    expect(pdf.surface).toBe("openme-tab");
    expect(markdown.viewerId).toBe("markdown-viewer");
    expect(markdown.canEdit).toBe(true);
    expect(markdown.surface).toBe("openme-tab");
  });

  it("opens professional and high-risk families inside OpenMe with honest boundaries", () => {
    const cad = getViewerRouteForFormat(format(".dwg"));
    const installer = getViewerRouteForFormat(format(".exe"));
    const disk = getViewerRouteForFormat(format(".iso"));

    expect(cad.viewerId).toBe("cad-viewer");
    expect(cad.surface).toBe("openme-tab");
    expect(cad.canPreview).toBe(false);
    expect(installer.mode).toBe("restricted-card");
    expect(installer.surface).toBe("openme-tab");
    expect(installer.canPreview).toBe(false);
    expect(disk.mode).toBe("restricted-card");
    expect(disk.reason).toContain("OpenMe restricted card");
  });

  it("opens unknown paths conservatively inside OpenMe", () => {
    const route = getViewerRouteByPath("C:/work/file.unknownx");

    expect(route.viewerId).toBe("route-only");
    expect(route.mode).toBe("safe-card");
    expect(route.surface).toBe("openme-tab");
    expect(route.canPreview).toBe(false);
  });

  it("provides an OpenMe route surface for every registered format", () => {
    expect(getRoutableFormatCount(FILE_FORMATS)).toBe(FILE_FORMATS.length);

    for (const entry of FILE_FORMATS) {
      const route = getViewerRouteForFormat(entry);
      expect(route.viewerId.length).toBeGreaterThan(0);
      expect(route.surface).toBe("openme-tab");
      expect(route.reason).toContain("OpenMe");
      expect(route.reason.length).toBeGreaterThan(20);
      expect(route.boundary.length).toBeGreaterThan(10);
      if (route.mode === "restricted-card") expect(route.canPreview).toBe(false);
    }
  });
});
