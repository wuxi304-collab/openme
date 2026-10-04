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

  it("renders toolbar buttons labelled with locale strings", async () => {
    renderDwg({ filePath: "/tmp/plan.dwg", fileName: "plan.dwg" });
    // renderCadDocument resolves { success: false } above, so the viewer has to
    // fall back to the compat canvas before the LibreDWG command buttons mean
    // anything. The buttons are gated on viewMode === "compat" precisely so we
    // never show commands for an engine we have not loaded.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Fit window" })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Pan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Redo" })).toBeTruthy();
  });

  it("hands the drawing to CadSvgCanvas and hides the compat commands in native mode", async () => {
    (window as any).electronAPI.renderCadDocument = vi.fn().mockResolvedValue({
      success: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="10" y="20">A1</text></svg>',
    });
    renderDwg({ filePath: "/tmp/plan.dwg", fileName: "plan.dwg" });
    // The switch only appears once ACadSharp actually produced markup.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Compat canvas" })).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: "Fit window" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });
});
