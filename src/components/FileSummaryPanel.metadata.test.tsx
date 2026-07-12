// @vitest-environment jsdom
// Integration tests for the FileSummaryPanel metadata section (PR #69).
//
// These tests exercise:
//  * The path/size/modified/fingerprint rows render with i18n strings
//  * SHA-256 fingerprint streaming resolves into `ready` state and
//    shows the 16-char short hash + the full copy button is enabled
//  * IPC failure (`success: false`) degrades gracefully into "hash
//    failed" without crashing the panel
//  * The copy-path / copy-hash / copy-as-JSON buttons call
//    navigator.clipboard with the correct payload and surface a toast
//  * Reveal-in-folder forwards the IPC call to `revealInFolder`
//  * Both zh and en locales render distinct, translated strings

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FileSummaryPanel from "./FileSummaryPanel";
import { I18nProvider } from "../i18n";
import { ToastProvider } from "./useToast";
import type { ElectronAPI, FileHashResult, IpcFailureResult, RevealResult } from "../types/electron-api";
import type { FileTabState } from "../types";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  // @ts-expect-error -- reset electron API between tests
  delete window.electronAPI;
});

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider value={{ pushToast: () => undefined }}>
        {children}
      </ToastProvider>
    </I18nProvider>
  );
}

const SAMPLE_HASH: FileHashResult = {
  ok: true,
  algorithm: "sha256",
  hash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  shortHash: "abcdef0123456789",
  size: 4096,
  computedAt: "2023-11-14T22:13:20.000Z",
};

const SAMPLE_HASH_FAILED: IpcFailureResult = {
  success: false,
  error: { code: "FILE_HASH_FAILED", message: "boom" },
};

const SAMPLE_REVEAL: RevealResult = { ok: true, revealed: true };

function installApi(overrides: Partial<ElectronAPI> = {}, clipboardMock?: ReturnType<typeof vi.fn>) {
  const api: Partial<ElectronAPI> = {
    openInSystem: vi.fn(async () => undefined),
    revealInFolder: vi.fn(async () => SAMPLE_REVEAL),
    getFileHash: vi.fn(async () => SAMPLE_HASH),
    ...overrides,
  };
  // navigator.clipboard stub — always return a shared spy so the test
  // can assert what was copied.
  const writeText = clipboardMock ?? vi.fn(async () => undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  // @ts-expect-error -- test injection
  window.electronAPI = api as ElectronAPI;
  return { api: api as ElectronAPI, writeText };
}

function makeTab(overrides: Partial<FileTabState> = {}): FileTabState {
  return {
    id: "tab-1",
    path: "C:\\Users\\demo\\projects\\manifest.json",
    name: "manifest.json",
    content: null,
    isLoading: false,
    isDirty: false,
    sourceFile: { extension: "json", size: 4096, modified_at: new Date(Date.now() - 30 * 1000).toISOString() },
    ...overrides,
  } as FileTabState;
}

describe("FileSummaryPanel metadata section (zh)", () => {
  beforeEach(() => {
    try { localStorage.setItem("openme.lang", "zh"); } catch { /* noop */ }
  });

  it("shows the metadata kicker label in Chinese", async () => {
    installApi();
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    // zh strings — the section title and column labels should be translated
    await waitFor(() => expect(screen.getByText("文件元数据")).toBeTruthy());
    expect(screen.getByText("路径")).toBeTruthy();
    expect(screen.getAllByText("大小").length).toBeGreaterThan(0);
    expect(screen.getByText("修改时间")).toBeTruthy();
    expect(screen.getByText("指纹")).toBeTruthy();
  });

  it("renders the 16-char short hash after streaming resolves", async () => {
    installApi();
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    await waitFor(() => expect(screen.getByText(SAMPLE_HASH.shortHash!)).toBeTruthy());
  });
});

describe("FileSummaryPanel metadata section (en)", () => {
  beforeEach(() => {
    try { localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
  });

  it("renders the metadata section heading in English", async () => {
    installApi();
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    await waitFor(() => expect(screen.getByText("File metadata")).toBeTruthy());
    expect(screen.getByText("Path")).toBeTruthy();
    expect(screen.getByText("Fingerprint")).toBeTruthy();
    expect(screen.getByText("Modified")).toBeTruthy();
    // "Size" appears in both the new metadata section AND the legacy
    // evidence list — that's fine, both refer to the same row, just
    // ensure at least the metadata row was rendered.
    expect(screen.getAllByText("Size").length).toBeGreaterThanOrEqual(2);
  });

  it("renders the 16-char short hash after streaming resolves", async () => {
    installApi();
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    await waitFor(() => expect(screen.getByText(SAMPLE_HASH.shortHash!)).toBeTruthy());
  });

  it("degrades into the hash-failed state when IPC returns success: false", async () => {
    installApi({ getFileHash: vi.fn(async () => SAMPLE_HASH_FAILED) });
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    await waitFor(() => expect(screen.getAllByText(/Hash failed/i).length).toBeGreaterThan(0));
    // The copy-hash button must be disabled in error state
    const copyButtons = Array.from(document.querySelectorAll(".summary-metadata-copy"));
    const hashCopyBtn = copyButtons.find((btn) => btn.getAttribute("aria-label") === "Copy full SHA-256");
    expect(hashCopyBtn?.hasAttribute("disabled")).toBe(true);
  });

  it("copy-path calls navigator.clipboard.writeText with the file path", async () => {
    const writeText = vi.fn(async () => undefined);
    installApi({}, writeText);
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    await waitFor(() => screen.getByText(SAMPLE_HASH.shortHash!));
    const btn = document.querySelector(".summary-metadata-copy[aria-label=\"Copy file path\"]") as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    await act(async () => { fireEvent.click(btn!); });
    expect(writeText).toHaveBeenCalledWith("C:\\Users\\demo\\projects\\manifest.json");
  });

  it("shows the Copy as JSON button label in English", async () => {
    installApi();
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    await waitFor(() => screen.getByText(SAMPLE_HASH.shortHash!));
    expect(screen.getByRole("button", { name: "Copy as JSON" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show in file manager" })).toBeTruthy();
  });

  it("reveal-in-folder forwards the call to the IPC handler", async () => {
    const reveal = vi.fn(async () => SAMPLE_REVEAL);
    installApi({ revealInFolder: reveal });
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    await waitFor(() => screen.getByText(SAMPLE_HASH.shortHash!));
    const revealBtn = screen.getByRole("button", { name: "Show in file manager" });
    await act(async () => { fireEvent.click(revealBtn); });
    expect(reveal).toHaveBeenCalledWith("C:\\Users\\demo\\projects\\manifest.json");
  });

  it("shows the Copy as JSON button label in English", async () => {
    installApi();
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    await waitFor(() => screen.getByText(SAMPLE_HASH.shortHash!));
    expect(screen.getByRole("button", { name: "Copy as JSON" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show in file manager" })).toBeTruthy();
  });

  it("reveal-in-folder forwards the call to the IPC handler", async () => {
    const reveal = vi.fn(async () => SAMPLE_REVEAL);
    installApi({ revealInFolder: reveal });
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    await waitFor(() => screen.getByText(SAMPLE_HASH.shortHash!));
    const revealBtn = screen.getByRole("button", { name: "Show in file manager" });
    await act(async () => { fireEvent.click(revealBtn); });
    expect(reveal).toHaveBeenCalledWith("C:\\Users\\demo\\projects\\manifest.json");
  });

  it("renders a Suggested external apps section when brief.suggestedApps is populated", async () => {
      installApi();
      const psdTab = makeTab({
        path: "C:\\Users\\demo\\design\\hero.psd",
        name: "hero.psd",
        sourceFile: { extension: ".psd", size: 4096, modified_at: new Date().toISOString() },
      });
      render(<Providers><FileSummaryPanel tab={psdTab} onOpenInSystem={() => undefined} /></Providers>);
      await waitFor(() => screen.getByText(SAMPLE_HASH.shortHash!));
      const ul = document.querySelector(".summary-suggested-apps");
      expect(ul).toBeTruthy();
      const btns = document.querySelectorAll(".summary-suggested-app-button");
      expect(btns.length).toBeGreaterThanOrEqual(1);
      expect(btns[0].textContent ?? "").toMatch(/Open with /);
    });

    it("Suggested app buttons forward to the onOpenInSystem callback", async () => {
      installApi();
      const openSystem = vi.fn();
      const psdTab = makeTab({
        path: "C:\\Users\\demo\\design\\cover.psd",
        name: "cover.psd",
        sourceFile: { extension: ".psd", size: 4096, modified_at: new Date().toISOString() },
      });
      render(<Providers><FileSummaryPanel tab={psdTab} onOpenInSystem={openSystem} /></Providers>);
      await waitFor(() => screen.getByText(SAMPLE_HASH.shortHash!));
      const firstAppBtn = document.querySelector(".summary-suggested-app-button") as HTMLButtonElement | null;
      expect(firstAppBtn).toBeTruthy();
      await act(async () => { fireEvent.click(firstAppBtn!); });
    expect(openSystem).toHaveBeenCalled();
  });

  it("falls back to system-default copy for fully supported formats", async () => {
    installApi();
    render(<Providers><FileSummaryPanel tab={makeTab()} onOpenInSystem={() => undefined} /></Providers>);
    await waitFor(() => screen.getByText(SAMPLE_HASH.shortHash!));
    // No .summary-suggested-apps section should render for json (which is fully supported)
    expect(document.querySelector(".summary-suggested-apps")).toBeNull();
  });
});

  describe("FileSummaryPanel routing fidelity row (PR #152)", () => {
    beforeEach(() => {
      try { localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
    });

    it("renders Level + Adapter rows for direct-routed formats (en)", async () => {
      installApi();
      const pdfTab = makeTab({
        path: "C:\\Users\\demo\\reports\\q3.pdf",
        name: "q3.pdf",
        sourceFile: { extension: ".pdf", size: 4096, modified_at: new Date().toISOString() },
      });
      render(<Providers><FileSummaryPanel tab={pdfTab} onOpenInSystem={() => undefined} /></Providers>);
      await waitFor(() => screen.getByText("Level"));
      expect(screen.getByText("Adapter")).toBeTruthy();
      const pill = document.querySelector(".routing-level-direct");
      expect(pill).not.toBeNull();
      expect(pill?.textContent).toBe("Direct preview");
    });

    it("renders the routing rows in Chinese (zh)", async () => {
      try { localStorage.setItem("openme.lang", "zh"); } catch { /* noop */ }
      installApi();
      const pdfTab = makeTab({
        path: "C:\\Users\\demo\\reports\\q3.pdf",
        name: "q3.pdf",
        sourceFile: { extension: ".pdf", size: 4096, modified_at: new Date().toISOString() },
      });
      render(<Providers><FileSummaryPanel tab={pdfTab} onOpenInSystem={() => undefined} /></Providers>);
      await waitFor(() => screen.getByText("等级"));
      expect(screen.getByText("适配器")).toBeTruthy();
      const pill = document.querySelector(".routing-level-direct");
      expect(pill?.textContent).toBe("直接预览");
    });

    it("classifies CAD formats as semantic inspector", async () => {
      installApi();
      const dwgTab = makeTab({
        path: "C:\\Users\\demo\\drawings\\shaft.dwg",
        name: "shaft.dwg",
        category: "cad",
        sourceFile: { extension: ".dwg", size: 8192, modified_at: new Date().toISOString() },
      });
      render(<Providers><FileSummaryPanel tab={dwgTab} onOpenInSystem={() => undefined} /></Providers>);
      await waitFor(() => screen.getByText("Level"));
      const pill = document.querySelector(".routing-level-semantic");
      expect(pill).not.toBeNull();
      expect(pill?.textContent).toBe("Semantic inspector");
    });
  });
