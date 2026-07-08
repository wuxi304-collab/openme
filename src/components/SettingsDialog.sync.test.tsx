// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within, act } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import { SettingsProvider, type Settings } from "../settings";
import { ConfirmProvider } from "./useConfirm";
import { ToastProvider } from "./useToast";
import SettingsDialog from "./SettingsDialog";
import type { ToastKind } from "./Toast";
import type { IpcFailureResult } from "../core/ipcError";

const flushMicrotasks = async () => {
  // Two microtask ticks (await resolution) plus two macrotask ticks so any
  // React.lazy Suspense boundary has time to switch from the null fallback
  // to the real dialog before the next assertion runs.
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

function buildValidPayload(overrides: Partial<Settings> = {}): unknown {
  return {
    type: "openme-settings",
    version: 1,
    exportedAt: new Date().toISOString(),
    app: { name: "OpenMe Qiwu", version: "1.0.0" },
    settings: {
      theme: "light",
      confirmTabClose: false,
      recentLimit: 10,
      tabSize: 2,
      lineNumbers: "off",
      wordWrap: "on",
      ...overrides,
    },
  };
}

function renderWithProviders(opts: {
  electronOverrides?: Partial<Window["electronAPI"]>;
} = {}) {
  // Preload the lazy confirm dialog module so Suspense doesn't need an
  // additional tick to resolve the bundle during the import flow.
  void import("./ConfirmDialog");
  void import("./SettingsDialog");

  const exportMock = vi.fn(async (_payload: unknown, _name?: string) => ({ ok: true as const, path: "/tmp/openme-settings.json" }));
  const importMock = vi.fn(async () => ({ ok: true as const, path: "/tmp/incoming.json", data: buildValidPayload() }));

  if (opts.electronOverrides?.exportSettingsToFile) exportMock.mockImplementation(opts.electronOverrides.exportSettingsToFile as never);
  if (opts.electronOverrides?.importSettingsFromFile) importMock.mockImplementation(opts.electronOverrides.importSettingsFromFile as never);

  window.electronAPI = {
    ...(window.electronAPI as object),
    exportSettingsToFile: exportMock,
    importSettingsFromFile: importMock,
  } as Window["electronAPI"];

  const captured: Array<{ kind: ToastKind; message: string }> = [];
  const pushToast = (kind: ToastKind, message: string) => { captured.push({ kind, message }); };

  try { localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
  const onClose = vi.fn();

  const utils = render(
    <I18nProvider>
      <SettingsProvider>
        <ToastProvider value={{ pushToast }}>
          <ConfirmProvider>
            <SettingsDialog open onClose={onClose} />
          </ConfirmProvider>
        </ToastProvider>
      </SettingsProvider>
    </I18nProvider>
  );

  return { utils, onClose, pushToast, captured, exportMock, importMock };
}

describe("SettingsDialog — cross-device sync", () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* noop */ }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  it("renders the Cross-device sync section with export and import buttons", () => {
    renderWithProviders();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Cross-device sync")).toBeTruthy();
    expect(within(dialog).getByText(/Export to file/i)).toBeTruthy();
    expect(within(dialog).getByText(/Import from file/i)).toBeTruthy();
  });

  it("clicking Export calls the IPC and pushes a success toast with the file path", async () => {
    const { captured, exportMock } = renderWithProviders();
    const exportButton = screen.getByText(/Export to file/i).closest("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(exportButton);
      await flushMicrotasks();
    });
    expect(exportMock).toHaveBeenCalledTimes(1);
    const success = captured.find((c) => c.kind === "success");
    expect(success?.message).toMatch(/Exported settings to/i);
    expect(success?.message).toContain("/tmp/openme-settings.json");
  });

  it("Export does not push a toast when the user cancels the save dialog", async () => {
    const cancelExport = vi.fn(async () => ({ ok: false as const, canceled: true as const }));
    const { captured, exportMock } = renderWithProviders({ electronOverrides: { exportSettingsToFile: cancelExport } });
    const exportButton = screen.getByText(/Export to file/i).closest("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(exportButton);
      await flushMicrotasks();
    });
    expect(exportMock).toHaveBeenCalledTimes(1);
    expect(captured).toEqual([]);
  });

  it("Import applies the new settings after the user confirms", async () => {
    const validPayload = buildValidPayload({ theme: "light", tabSize: 8, recentLimit: 10 });
    const importMock = vi.fn(async () => ({ ok: true as const, path: "/tmp/in.json", data: validPayload }));
    const { captured } = renderWithProviders({ electronOverrides: { importSettingsFromFile: importMock } });

    const importButton = screen.getByText(/Import from file/i).closest("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(importButton);
      await flushMicrotasks();
    });

    // ConfirmDialog should appear with the warning copy
    await screen.findByText("Apply imported settings?");

    // Click the import-and-apply button (in the confirm dialog)
    const confirmButton = screen.getByText("Import and apply").closest("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(confirmButton);
      await flushMicrotasks();
    });

    const stored = JSON.parse(localStorage.getItem("openme.settings.v1") ?? "{}");
    expect(stored.theme).toBe("light");
    expect(stored.tabSize).toBe(8);
    expect(captured.some((c) => c.kind === "success" && /Imported settings/i.test(c.message))).toBe(true);
  });

  it("Import does not apply settings when the user cancels the confirm", async () => {
    const validPayload = buildValidPayload({ theme: "light" });
    const importMock = vi.fn(async () => ({ ok: true as const, path: "/tmp/in.json", data: validPayload }));
    renderWithProviders({ electronOverrides: { importSettingsFromFile: importMock } });

    const importButton = screen.getByText(/Import from file/i).closest("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(importButton);
      await flushMicrotasks();
    });

    await screen.findByText("Apply imported settings?");

    // Find the confirm dialog's Cancel button
    const cancelButton = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Cancel") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(cancelButton);
      await flushMicrotasks();
    });

    const stored = JSON.parse(localStorage.getItem("openme.settings.v1") ?? "{}");
    // Theme stays at default 'dark'
    expect(stored.theme ?? "dark").toBe("dark");
  });

  it("Import shows an invalid-JSON toast when the file is not JSON", async () => {
    const failure = { success: false, code: "SETTINGS_IMPORT_INVALID_JSON", params: {}, message: "settings file is not valid JSON" } as IpcFailureResult;
    const importMock = vi.fn(async () => failure);
    const { captured } = renderWithProviders({ electronOverrides: { importSettingsFromFile: importMock } });
    const importButton = screen.getByText(/Import from file/i).closest("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(importButton);
      await flushMicrotasks();
    });
    const err = captured.find((c) => c.kind === "error");
    expect(err?.message).toMatch(/not valid JSON/i);
  });

  it("Import shows a wrong-shape toast when the payload is missing type/version", async () => {
    const importMock = vi.fn(async () => ({ ok: true as const, path: "/tmp/in.json", data: { settings: { theme: "light" } } }));
    const { captured } = renderWithProviders({ electronOverrides: { importSettingsFromFile: importMock } });
    const importButton = screen.getByText(/Import from file/i).closest("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(importButton);
      await flushMicrotasks();
    });
    const err = captured.find((c) => c.kind === "error");
    expect(err?.message).toMatch(/not an OpenMe settings file/i);
  });

  it("Import does nothing visible when the file dialog is canceled", async () => {
    const cancelImport = vi.fn(async () => ({ ok: false as const, canceled: true as const }));
    const { captured } = renderWithProviders({ electronOverrides: { importSettingsFromFile: cancelImport } });
    const importButton = screen.getByText(/Import from file/i).closest("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(importButton);
      await flushMicrotasks();
    });
    expect(captured).toEqual([]);
  });
});
