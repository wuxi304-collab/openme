// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import ZipViewer from "./ZipViewer";

const sampleEntries = [
  { name: "README.md", isDir: false, size: 2048 },
  { name: "src/index.ts", isDir: false, size: 4096 },
  { name: "src/utils", isDir: true, size: 0 },
];

beforeEach(() => {
  try {
    window.localStorage.setItem("openme.lang", "en");
  } catch {
    // ignore
  }
  (window as any).electronAPI = {
    listZipContents: vi.fn().mockResolvedValue({ success: true, entries: sampleEntries }),
    readZipEntry: vi.fn().mockResolvedValue({ success: true, data: btoa("hello") }),
    selectFolderDialog: vi.fn().mockResolvedValue(null),
    unzipFile: vi.fn(),
    openInSystem: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderZip(props: Parameters<typeof ZipViewer>[0]) {
  return render(
    <I18nProvider>
      <ZipViewer {...props} />
    </I18nProvider>
  );
}

describe("ZipViewer polish", () => {
  it("renders toolbar with aria-label and file count line", async () => {
    renderZip({ zipPath: "/tmp/sample.zip" });
    await waitFor(() => {
      expect(screen.getByRole("toolbar", { name: "Archive toolbar" })).toBeTruthy();
    });
    const header = screen.getByRole("toolbar", { name: "Archive toolbar" });
    expect(header.textContent).toMatch(/2 files/);
    expect(header.textContent).toMatch(/1 folder/);
  });

  it("renders file list as listbox with options", async () => {
    renderZip({ zipPath: "/tmp/sample.zip" });
    await waitFor(() => {
      expect(screen.getByRole("listbox", { name: "Archive file list" })).toBeTruthy();
    });
    const options = screen.getAllByRole("option");
    expect(options.length).toBe(2);
  });

  it("renders preview region with aria-label and prompt before selection", async () => {
    renderZip({ zipPath: "/tmp/sample.zip" });
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "File preview" })).toBeTruthy();
    });
    expect(screen.getByText("Click a file to preview its content")).toBeTruthy();
  });
});
