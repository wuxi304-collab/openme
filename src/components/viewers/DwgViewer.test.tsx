// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import DwgViewer from "./DwgViewer";

beforeEach(() => {
  try {
    window.localStorage.setItem("openme.lang", "en");
  } catch {
    // ignore
  }
  (window as any).electronAPI = {
    getCadEngineStatus: vi.fn().mockResolvedValue({
      kind: "libredwg",
      name: "LibreDWG",
      nameCode: "dwgEngineLibreDwg",
      messageCode: "dwgEngineMessageLibreDwg",
      fallback: true,
    }),
    inspectCadDocument: vi.fn(),
    renderCadDocument: vi.fn().mockResolvedValue({ success: false }),
    readBinary: vi.fn(),
    openInSystem: vi.fn(),
  };
  // Stub dynamic import of @mlightcad so the heavy bundle never loads in jsdom
  vi.doMock("@mlightcad/cad-simple-viewer", () => ({
    AcApDocManager: {
      createInstance: () => ({
        openDocument: () => Promise.resolve(false),
        destroy: () => Promise.resolve(),
        sendStringToExecute: () => undefined,
      }),
    },
    AcEdOpenMode: { Write: 0 },
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.doUnmock("@mlightcad/cad-simple-viewer");
});

function renderDwg(props: Parameters<typeof DwgViewer>[0]) {
  return render(
    <I18nProvider>
      <DwgViewer {...props} />
    </I18nProvider>
  );
}

describe("DwgViewer polish", () => {
  it("renders CAD toolbar with role=toolbar and aria-label", () => {
    renderDwg({ filePath: "/tmp/plan.dwg", fileName: "plan.dwg" });
    expect(screen.getByRole("toolbar", { name: "CAD toolbar" })).toBeTruthy();
  });

  it("renders canvas with role=img and aria-label", () => {
    renderDwg({ filePath: "/tmp/plan.dwg", fileName: "plan.dwg" });
    const canvas = document.querySelector('[role="img"][aria-label="DWG canvas"]');
    expect(canvas).toBeTruthy();
  });

  it("renders toolbar buttons labelled with locale strings", () => {
    renderDwg({ filePath: "/tmp/plan.dwg", fileName: "plan.dwg" });
    expect(screen.getByRole("button", { name: "Fit window" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Redo" })).toBeTruthy();
  });
});
