import { describe, expect, it } from "vitest";
import { BASE_FILE_FORMATS, EXPANDED_FILE_FORMATS, FILE_FORMATS, dedupeByExtension, getFileFormatByExtension, getFileFormatByPath } from ".";
import type { FileFormatDefinition } from ".";
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

  it("has no duplicate extensions in the raw source arrays", () => {
    // The previous assertion only inspected the already-deduped FILE_FORMATS array, so a
    // duplicate such as `.ts` (TypeScript vs MPEG Transport Stream) was silently collapsed
    // and never failed the suite. Assert the invariant at the source level instead.
    const raw = [...BASE_FILE_FORMATS, ...EXPANDED_FILE_FORMATS];
    const seen = new Map<string, string[]>();
    for (const format of raw) {
      const key = format.extension.toLowerCase();
      seen.set(key, [...(seen.get(key) ?? []), format.name]);
    }
    const duplicates = [...seen.entries()].filter(([, names]) => names.length > 1);
    expect(duplicates, `duplicate extensions: ${JSON.stringify(duplicates)}`).toEqual([]);
  });

  it("resolves the ambiguous .ts extension to TypeScript, not a transport stream", () => {
    const format = getFileFormatByExtension(".ts");
    expect(format?.name).toBe("TypeScript");
    expect(format?.category).toBe("code");
    expect(detectCategory("C:/sample/component.ts")).toBe("code");
    expect(getFileFormatByPath("C:/sample/component.tsx")?.category).toBe("code");
  });

  it("keeps camcorder transport streams on .m2ts and .mts", () => {
    expect(getFileFormatByExtension(".m2ts")?.category).toBe("video");
    expect(getFileFormatByExtension(".mts")?.category).toBe("video");
  });

  it("resolves duplicate extension claims to the text-like reading regardless of order", () => {
    const make = (name: string, category: FileCategory): FileFormatDefinition => ({
      extension: ".dup",
      name,
      category,
      capabilities: ["detect"],
      supportLevel: "D",
      boundary: "boundary text long enough",
    });

    const videoFirst = dedupeByExtension([make("Video Thing", "video"), make("Text Thing", "code")]);
    expect(videoFirst).toHaveLength(1);
    expect(videoFirst[0].category).toBe("code");

    const codeFirst = dedupeByExtension([make("Text Thing", "code"), make("Video Thing", "video")]);
    expect(codeFirst).toHaveLength(1);
    expect(codeFirst[0].category).toBe("code");
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
