import { describe, expect, it } from "vitest";
import { FILE_FORMATS, getFileFormatByExtension, getFileFormatByPath } from ".";
import type { FileCategory } from "../types";
import { detectCategory } from "../utils/fileTypeDetector";

const validCategories = new Set<FileCategory>([
  "code",
  "markdown",
  "json",
  "csv",
  "image",
  "svg",
  "pdf",
  "office",
  "archive",
  "epub",
  "audio",
  "video",
  "font",
  "cad",
  "dwg",
  "design",
  "package",
  "disk",
  "other",
]);

const validSupportLevels = new Set(["A+", "A", "B", "C", "D", "E", "F"]);
const routeOnlyCategories = new Set<FileCategory>(["package", "disk", "design"]);

describe("registry coverage", () => {
  it("has no duplicate extensions", () => {
    const extensions = FILE_FORMATS.map((format) => format.extension.toLowerCase());
    expect(new Set(extensions).size).toBe(extensions.length);
  });

  it("makes every registered extension detectable by extension and path", () => {
    for (const format of FILE_FORMATS) {
      expect(getFileFormatByExtension(format.extension)?.extension).toBe(format.extension);
      expect(getFileFormatByPath(`C:/sample/openme-test${format.extension}`)?.extension).toBe(format.extension);
      expect(detectCategory(`C:/sample/openme-test${format.extension}`)).toBe(format.category);
    }
  });

  it("requires every registry entry to have category capability level and boundary", () => {
    for (const format of FILE_FORMATS) {
      expect(validCategories.has(format.category)).toBe(true);
      expect(format.capabilities.length).toBeGreaterThan(0);
      expect(validSupportLevels.has(format.supportLevel)).toBe(true);
      expect(format.boundary.trim().length).toBeGreaterThan(10);
    }
  });

  it("keeps unsafe route-only families non-editable", () => {
    for (const format of FILE_FORMATS.filter((entry) => routeOnlyCategories.has(entry.category))) {
      expect(format.capabilities).not.toContain("edit");
    }
  });
});
