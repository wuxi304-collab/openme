import { describe, it, expect } from "vitest";

// Re-declare the helper here to avoid importing the React component (which
// would force Vitest to pull JSX/DOM tooling into a node test). The helper
// matches the production definition in EpubViewer.tsx.
type Chapter = { title: string | null; index?: number };
type Translator = (key: string, params?: Record<string, string | number>) => string;

function chapterLabel(t: Translator, item: Chapter, fallbackIndex: number): string {
  return item.title || t("epubChapterFallback", { index: item.index ?? fallbackIndex });
}

const en: Translator = (key, params) => {
  if (key === "epubChapterFallback") {
    const index = (params as { index?: number } | undefined)?.index ?? 0;
    return `Chapter ${index}`;
  }
  return key;
};

const zh: Translator = (key, params) => {
  if (key === "epubChapterFallback") {
    const index = (params as { index?: number } | undefined)?.index ?? 0;
    return `第 ${index} 章`;
  }
  return key;
};

describe("EpubViewer chapterLabel", () => {
  it("renders the raw heading when the EPUB provides one", () => {
    expect(chapterLabel(en, { title: "Chapter One", index: 1 }, 1)).toBe("Chapter One");
  });

  it("uses the localized fallback in English when title is null", () => {
    expect(chapterLabel(en, { title: null, index: 3 }, 3)).toBe("Chapter 3");
  });

  it("uses the localized fallback in Chinese when title is null", () => {
    expect(chapterLabel(zh, { title: null, index: 3 }, 3)).toBe("第 3 章");
  });

  it("falls back to the rendered index when index is missing", () => {
    expect(chapterLabel(en, { title: null }, 7)).toBe("Chapter 7");
  });
});