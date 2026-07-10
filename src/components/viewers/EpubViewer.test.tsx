// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import EpubViewer from "./EpubViewer";

const sampleBook = {
  title: "Test book",
  creator: "Author",
  language: "zh-CN",
  cover: null,
  chapters: [
    { index: 1, title: "第一章", text: "首段内容。\n第二段内容。" },
    { index: 2, title: null, text: "另一个章节。" },
  ],
};

beforeEach(() => {
  (window as any).electronAPI = {
    readEpub: vi.fn().mockResolvedValue({ success: true, book: sampleBook }),
    openInSystem: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sessionStorage.clear();
});

function renderEpub(props: Parameters<typeof EpubViewer>[0]) {
  return render(
    <I18nProvider>
      <EpubViewer {...props} />
    </I18nProvider>
  );
}

describe("EpubViewer polish", () => {
  beforeEach(() => {
    try {
      window.localStorage.setItem("openme.lang", "en");
    } catch {
      // ignore
    }
  });

  it("renders reader region with aria-label and toolbar role", async () => {
    renderEpub({ filePath: "/library/test.epub" });
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Chapter body" })).toBeTruthy();
    });
    expect(screen.getByRole("toolbar", { name: "Reading toolbar" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Chapter navigation" })).toBeTruthy();
  });

  it("renders chapter buttons in TOC with aria-current on active chapter", async () => {
    renderEpub({ filePath: "/library/test.epub" });
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /1\s*第一章/ })[0]).toBeTruthy();
    });
    const active = document.querySelector('[aria-current="page"]');
    expect(active).toBeTruthy();
    expect((active as HTMLElement).textContent).toMatch(/第一章/);
  });
});
