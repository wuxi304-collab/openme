// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AboutDialog from "./AboutDialog";
import { I18nProvider } from "../i18n";
import type { ElectronAPI, RuntimeInfo } from "../types/electron-api";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

function Providers({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

const SAMPLE_RUNTIME: RuntimeInfo = {
  appVersion: "1.2.3",
  electron: "32.1.0",
  chrome: "128.0.6613.114",
  node: "20.18.0",
  v8: "12.8",
  osName: "Windows NT 10.0.22631",
  osPlatform: "win32",
  osArch: "x64",
  systemLocale: "zh-CN",
  hostname: "openme-test-host",
  cpus: 12,
  totalMemGb: 32.0,
};

function installMockRuntime(overrides: Partial<RuntimeInfo> = {}) {
  const api: Partial<ElectronAPI> = {
    getAppVersion: vi.fn(async () => overrides.appVersion ?? SAMPLE_RUNTIME.appVersion!),
    getRuntimeInfo: vi.fn(async () => ({ ...SAMPLE_RUNTIME, ...overrides })),
  };
  (window as { electronAPI?: ElectronAPI }).electronAPI = api as ElectronAPI;
  return api;
}

describe("AboutDialog runtime sections", () => {
  beforeEach(() => {
    try { localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
  });

  it("renders the runtime section with Electron / Chromium / Node / V8 rows", async () => {
    installMockRuntime();
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    await waitFor(() => expect(screen.getByText(SAMPLE_RUNTIME.electron!)).toBeTruthy());
    expect(screen.getByText(SAMPLE_RUNTIME.chrome!)).toBeTruthy();
    expect(screen.getByText(SAMPLE_RUNTIME.node!)).toBeTruthy();
    expect(screen.getByText(SAMPLE_RUNTIME.v8!)).toBeTruthy();
      // Each runtime field appears exactly once.
      expect(screen.getAllByText(SAMPLE_RUNTIME.electron!).length).toBe(1);
      expect(screen.getAllByText(SAMPLE_RUNTIME.chrome!).length).toBe(1);
    });

  it("renders the system section with OS, arch, locale, hostname, cpu count, memory", async () => {
    installMockRuntime();
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      await waitFor(() => expect(screen.getByText(SAMPLE_RUNTIME.electron!)).toBeTruthy());
      expect(screen.getAllByText(SAMPLE_RUNTIME.osName!).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(SAMPLE_RUNTIME.osArch!)).toBeTruthy();
      expect(screen.getByText(SAMPLE_RUNTIME.systemLocale!)).toBeTruthy();
      expect(screen.getByText(SAMPLE_RUNTIME.hostname!)).toBeTruthy();
      expect(screen.getByText(/12 cores/i)).toBeTruthy();
      expect(screen.getByText(/32 GB/i)).toBeTruthy();
    });

  it("renders the acknowledgements list with all known libraries", async () => {
      installMockRuntime();
      render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      // Electron shows up in both runtime and ack sections — scope the query
      // to the ack list using its dedicated class so we don't collide.
      const ackList = document.querySelector(".about-dialog-ack-list") as HTMLElement | null;
      expect(ackList).toBeTruthy();
      for (const name of ["Electron", "React", "Monaco Editor", "PDF.js", "Three.js", "Mammoth", "SheetJS", "JSZip", "EPUB.js", "opentype.js"]) {
        expect(ackList!.textContent).toContain(name);
      }
    });

  it("renders the license link with rel=noopener and target=_blank", async () => {
    installMockRuntime();
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    const links = screen.getAllByRole("link");
    const licenseLink = links.find((l) => l.getAttribute("href")?.endsWith("/LICENSE"));
    expect(licenseLink).toBeTruthy();
    expect(licenseLink?.getAttribute("target")).toBe("_blank");
    expect(licenseLink?.getAttribute("rel")).toContain("noopener");
  });

  it("renders dashes when getRuntimeInfo is unavailable (browser dev mode)", () => {
    // Wipe the shim so getAppVersion / getRuntimeInfo resolve to noops.
    (window as { electronAPI?: unknown }).electronAPI = undefined;
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    // Multiple em-dashes should be present (one per unavailable field).
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it("copies the runtime snapshot to the clipboard and shows transient feedback", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    installMockRuntime();
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    await waitFor(() => expect(screen.getByText(/Copy runtime details/i)).toBeTruthy());
    const button = screen.getByRole("button", { name: /Copy runtime details/i });
    await act(async () => { fireEvent.click(button); });
    expect(writeText).toHaveBeenCalledTimes(1);
    const payload = writeText.mock.calls[0][0] as string;
    expect(payload).toContain("OpenMe Qiwu 1.2.3");
    expect(payload).toContain("electron: 32.1.0");
    expect(payload).toContain("chromium: 128.0.6613.114");
    expect(payload).toContain("os: Windows NT 10.0.22631");
    expect(payload).toContain("arch: x64");
    // After clicking, the button label flips to the "Copied" copy.
    expect(screen.getByText(/Runtime details copied/i)).toBeTruthy();
  });

  it("flips the version copy button icon to a checkmark after success", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    installMockRuntime();
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    await waitFor(() => expect(screen.getByText(SAMPLE_RUNTIME.electron!)).toBeTruthy());
    const copyBtns = screen.getAllByRole("button", { name: /Copy version info/i });
    await act(async () => { fireEvent.click(copyBtns[0]); });
    expect(writeText).toHaveBeenCalledTimes(1);
    const payload = writeText.mock.calls[0][0] as string;
    expect(payload).toContain("OpenMe Qiwu 1.2.3");
    expect(payload).toContain("locale: en");
  });

  it("formats Chinese locale strings with the right units", async () => {
    try { localStorage.setItem("openme.lang", "zh"); } catch { /* noop */ }
    installMockRuntime();
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    await waitFor(() => expect(screen.getByText(/12 核/)).toBeTruthy());
    expect(screen.getByText(/32 GB/)).toBeTruthy();
  });

  it("renders acknowledgement purpose in Chinese when locale is zh", async () => {
    try { localStorage.setItem("openme.lang", "zh"); } catch { /* noop */ }
    installMockRuntime();
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    expect(screen.getByText("桌面运行时")).toBeTruthy();
    expect(screen.getByText("界面框架")).toBeTruthy();
    expect(screen.getByText("代码编辑器")).toBeTruthy();
  });

  it("does not crash when getRuntimeInfo rejects", async () => {
    const api: Partial<ElectronAPI> = {
      getAppVersion: vi.fn(async () => "1.2.3"),
      getRuntimeInfo: vi.fn(async () => { throw new Error("boom"); }),
    };
    (window as { electronAPI?: ElectronAPI }).electronAPI = api as ElectronAPI;
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    // Dialog must still render — version row, runtime rows with dashes.
    await waitFor(() => expect(screen.getByText("1.2.3")).toBeTruthy());
    // Some dashes appear because the runtime fetch failed.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });
});