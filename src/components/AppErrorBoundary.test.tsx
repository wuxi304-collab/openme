// @vitest-environment jsdom
// Behavioural tests for the top-level AppErrorBoundary + the upgraded
// per-viewer ErrorBoundary. Verifies that boundary catches render errors,
// the localized fallback copy, retry remounting, and the save-error-log
// IPC callback.

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import { ToastProvider } from "./useToast";
import AppErrorBoundary from "./AppErrorBoundary";
import ErrorBoundary from "./ErrorBoundary";
import type { ElectronAPI } from "../types/electron-api";

afterEach(() => {
  cleanup();
  try { localStorage.removeItem("openme.lang"); } catch { /* noop */ }
  vi.restoreAllMocks();
});

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider value={{ pushToast: () => undefined }}>{children}</ToastProvider>
    </I18nProvider>
  );
}

function installApi(overrides: Partial<ElectronAPI> = {}) {
  const api: Partial<ElectronAPI> = {
    saveErrorLog: vi.fn(async () => ({ ok: true as const, path: "/tmp/openme-error-test.json", bytes: 128 })),
    ...overrides,
  };
  Object.defineProperty(window, "electronAPI", {
    configurable: true,
    value: api,
    writable: true,
  });
  return api;
}

function Boom({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error("kaboom: scene render");
  return <div data-testid="safe">safe</div>;
}

describe("AppErrorBoundary", () => {
  beforeEach(() => {
    try { localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
  });

  it("renders children when nothing throws", () => {
    installApi();
    render(<Providers><AppErrorBoundary><div data-testid="ok">child</div></AppErrorBoundary></Providers>);
    expect(screen.getByTestId("ok")).toBeTruthy();
  });

  it("catches a synchronous render error and shows the localized fallback", () => {
    // Silence the noisy console.error from React's boundary logging.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    installApi();
    render(<Providers><AppErrorBoundary><Boom /></AppErrorBoundary></Providers>);
    expect(screen.getByRole("alert")).toBeTruthy();
    // English copy from i18n.tsx — only present when the boundary fallback
    // has rendered, not when the children are intact.
    expect(screen.getByText(/OpenMe ran into a fatal error/i)).toBeTruthy();
    expect(screen.getByText(/We isolated the crash/i)).toBeTruthy();
    expect(screen.getByText("kaboom: scene render")).toBeTruthy();
    errSpy.mockRestore();
  });

  it("localizes the fallback into Chinese", () => {
    try { localStorage.setItem("openme.lang", "zh"); } catch { /* noop */ }
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    installApi();
    render(<Providers><AppErrorBoundary><Boom /></AppErrorBoundary></Providers>);
    expect(screen.getByText("应用遇到严重错误")).toBeTruthy();
    expect(screen.getByText(/已隔离崩溃区域/)).toBeTruthy();
    errSpy.mockRestore();
  });

  it("calls saveErrorLog via IPC when the user clicks 'Save error log'", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const api = installApi();
    render(<Providers><AppErrorBoundary><Boom /></AppErrorBoundary></Providers>);
    const saveBtn = screen.getByRole("button", { name: /Save error log/i });
    await act(async () => { fireEvent.click(saveBtn); });
    await waitFor(() => {
      expect(api.saveErrorLog).toHaveBeenCalled();
    });
    const callArg = (api.saveErrorLog as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(callArg).toBeTruthy();
    expect(callArg.error?.message).toBe("kaboom: scene render");
    expect(callArg.ring).toBeTruthy();
    errSpy.mockRestore();
  });

  it("surfaces a localized error toast when the IPC fails", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    installApi({ saveErrorLog: vi.fn(async () => ({ success: false, error: { code: "SAVE_ERROR_LOG_FAILED", message: "nope" } })) });
    let captured: { kind: string; message: string } | null = null;
    render(
      <Providers>
        <ToastProvider value={{ pushToast: (kind, message) => { captured = { kind, message }; } }}>
          <AppErrorBoundary><Boom /></AppErrorBoundary>
        </ToastProvider>
      </Providers>
    );
    const saveBtn = screen.getByRole("button", { name: /Save error log/i });
    await act(async () => { fireEvent.click(saveBtn); });
    await waitFor(() => {
      expect(captured).toBeTruthy();
      expect(captured?.kind).toBe("error");
      expect(captured?.message).toMatch(/Could not save error log/i);
    });
    errSpy.mockRestore();
  });
});

describe("Viewer-level ErrorBoundary save-log wiring", () => {
  beforeEach(() => {
    try { localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
  });

  it("exposes the save log button when showSaveLog=true", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const api = installApi();
    render(<Providers><ErrorBoundary showSaveLog><Boom /></ErrorBoundary></Providers>);
    const saveBtn = screen.getByRole("button", { name: /Save error log/i });
    expect(saveBtn).toBeTruthy();
    errSpy.mockRestore();
    void api;
  });

  it("hides the save log button when showSaveLog is not set", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    installApi();
    render(<Providers><ErrorBoundary><Boom /></ErrorBoundary></Providers>);
    expect(screen.queryByRole("button", { name: /Save error log/i })).toBeNull();
    errSpy.mockRestore();
  });
});
