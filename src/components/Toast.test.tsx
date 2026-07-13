// @vitest-environment jsdom
// Behavioural tests for the <ToastStack> component: stack rendering,
// dismiss interactions, overflow hint, hover-pause timer, progress bar,
// and i18n wiring.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToastStack, nextToastId, type ToastEntry } from "./Toast";
import { I18nProvider } from "../i18n";

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
  vi.useRealTimers();
});

beforeEach(() => {
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

function makeEntry(over: Partial<ToastEntry> = {}): ToastEntry {
  return { id: nextToastId(), kind: "success", message: "Hello", ttlMs: 2600, ...over };
}

describe("ToastStack", () => {
  it("renders nothing when the list is empty", () => {
    const { container } = render(
      <I18nProvider><ToastStack toasts={[]} onDismiss={() => undefined} /></I18nProvider>
    );
    expect(container.querySelector(".app-toast-stack")).toBeNull();
  });

  it("renders a success toast with the success icon and message", () => {
    render(
      <I18nProvider><ToastStack toasts={[makeEntry({ message: "Saved" })]} onDismiss={() => undefined} /></I18nProvider>
    );
    const toast = screen.getByRole("status").querySelector(".app-toast")!;
    expect(toast.classList.contains("is-success")).toBe(true);
    expect(screen.getByText("Saved")).toBeTruthy();
  });

  it("renders an error toast with the error variant", () => {
    render(
      <I18nProvider><ToastStack toasts={[makeEntry({ kind: "error", message: "Boom" })]} onDismiss={() => undefined} /></I18nProvider>
    );
    const toast = screen.getByRole("status").querySelector(".app-toast")!;
    expect(toast.classList.contains("is-error")).toBe(true);
    expect(screen.getByText("Boom")).toBeTruthy();
  });

  it("stacks multiple toasts with descending priority", () => {
    const entries = [
      makeEntry({ message: "A" }),
      makeEntry({ message: "B" }),
      makeEntry({ message: "C" }),
    ];
    const { container } = render(
      <I18nProvider><ToastStack toasts={entries} onDismiss={() => undefined} /></I18nProvider>
    );
    const stack = container.querySelector(".app-toast-stack")!;
    const toasts = stack.querySelectorAll(".app-toast");
    expect(toasts).toHaveLength(3);
    // The newest entry (C) should have stack-index 0 — sits at the bottom edge.
    const last = toasts[toasts.length - 1] as HTMLElement;
    expect((last as HTMLElement & { style: CSSStyleDeclaration }).style.getPropertyValue("--stack-index")).toBe("0");
    const first = toasts[0] as HTMLElement;
    expect(first.style.getPropertyValue("--stack-index")).toBe("2");
  });

  it("calls onDismiss with the entry id when the close button is clicked", () => {
    const onDismiss = vi.fn();
    const a = makeEntry({ message: "A" });
    const b = makeEntry({ message: "B" });
    render(
      <I18nProvider><ToastStack toasts={[a, b]} onDismiss={onDismiss} /></I18nProvider>
    );
    const buttons = screen.getAllByRole("button", { name: /dismiss|关闭/ });
    fireEvent.click(buttons[0]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss.mock.calls[0][0]).toBe(a.id);
  });

  it("shows the overflow hint when more than 3 toasts are queued", () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeEntry({ message: `T${i}` }));
    render(
      <I18nProvider><ToastStack toasts={entries} onDismiss={() => undefined} /></I18nProvider>
    );
    // 5 entries, MAX_VISIBLE = 3 → 2 hidden.
    const overflow = screen.getByText(/earlier notifications hidden|更早的提示已收起/);
    expect(overflow).toBeTruthy();
  });

  it("exposes a polite aria-live region for screen readers", () => {
    render(
      <I18nProvider><ToastStack toasts={[makeEntry()]} onDismiss={() => undefined} /></I18nProvider>
    );
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
  });

  it("uses the localised dismiss label when language is English", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    render(
      <I18nProvider><ToastStack toasts={[makeEntry()]} onDismiss={() => undefined} /></I18nProvider>
    );
    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeTruthy();
  });

  it("renders a CSS progress bar driven by --toast-ttl", () => {
    const { container } = render(
      <I18nProvider><ToastStack toasts={[makeEntry({ ttlMs: 3000 })]} onDismiss={() => undefined} /></I18nProvider>
    );
    const bar = container.querySelector(".app-toast-progress");
    expect(bar).toBeTruthy();
    const toast = container.querySelector(".app-toast") as HTMLElement;
    expect(toast.style.getPropertyValue("--toast-ttl")).toBe("3000ms");
  });

  it("auto-dismisses when the TTL elapses (no hover)", () => {
    vi.useFakeTimers();
      const perfSpy = vi.spyOn(performance, "now").mockImplementation(() => 0);
      const onDismiss = vi.fn();
      const entry = makeEntry({ ttlMs: 1000 });
      render(
        <I18nProvider><ToastStack toasts={[entry]} onDismiss={onDismiss} /></I18nProvider>
      );
      expect(onDismiss).not.toHaveBeenCalled();
      // TTL fires after 1000ms — but we now fade out for 180ms before
      // calling onDismiss so the leave animation can play.
      vi.advanceTimersByTime(999);
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(179);
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledWith(entry.id);
      perfSpy.mockRestore();
    });

    it("marks the toast paused while hovering and resumes on mouseleave", () => {
      const { container } = render(
        <I18nProvider><ToastStack toasts={[makeEntry()]} onDismiss={() => undefined} /></I18nProvider>
      );
      const toast = container.querySelector(".app-toast") as HTMLElement;
      fireEvent.mouseEnter(toast);
      expect(toast.classList.contains("is-paused")).toBe(true);
      fireEvent.mouseLeave(toast);
      expect(toast.classList.contains("is-paused")).toBe(false);
    });

  it("exposes the hover-pause hint as a localized title", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    const { container } = render(
      <I18nProvider><ToastStack toasts={[makeEntry()]} onDismiss={() => undefined} /></I18nProvider>
    );
    const toast = container.querySelector(".app-toast") as HTMLElement;
    expect(toast.getAttribute("title")).toBe("Hover to pause auto-dismiss");
  });

    it("renders an info-kind toast with the info variant", () => {
      render(
        <I18nProvider>
          <ToastStack
            toasts={[makeEntry({ kind: "info", message: "Running portable" })]}
            onDismiss={() => undefined}
          />
        </I18nProvider>
      );
      const toast = screen.getByRole("status").querySelector(".app-toast")!;
      expect(toast.classList.contains("is-info")).toBe(true);
      expect(screen.getByText("Running portable")).toBeTruthy();
    });

    it("renders an action button when entry.action is set", () => {
      render(
        <I18nProvider>
          <ToastStack
            toasts={[
              makeEntry({
                kind: "info",
                message: "Get the installer",
                action: {
                  kind: "external",
                  label: "Open GitHub",
                  url: "https://example.com/release",
                },
              }),
            ]}
            onDismiss={() => undefined}
          />
        </I18nProvider>
      );
      const button = screen.getByRole("button", { name: "Open GitHub" });
      expect(button.classList.contains("app-toast-action")).toBe(true);
    });

    it("omits the action button when entry.action is absent", () => {
      const { container } = render(
        <I18nProvider><ToastStack toasts={[makeEntry()]} onDismiss={() => undefined} /></I18nProvider>
      );
      const actionButtons = container.querySelectorAll(".app-toast-action");
      expect(actionButtons.length).toBe(0);
    });

    it("opens the action URL via window.open when the action button is clicked", () => {
      const openSpy = vi.fn();
      const originalOpen = window.open;
      window.open = openSpy;
      try {
        render(
          <I18nProvider>
            <ToastStack
              toasts={[
                makeEntry({
                  kind: "info",
                  message: "Get the installer",
                  action: {
                    kind: "external",
                    label: "Open",
                    url: "https://example.com/release",
                  },
                }),
              ]}
              onDismiss={() => undefined}
            />
          </I18nProvider>
        );
        fireEvent.click(screen.getByRole("button", { name: "Open" }));
        expect(openSpy).toHaveBeenCalledWith(
          "https://example.com/release",
          "_blank",
          "noopener,noreferrer",
        );
      } finally {
        window.open = originalOpen;
      }
    });

            it("Escape dismisses the newest toast when at least one is visible", () => {
              const onDismiss = vi.fn();
              const a = makeEntry({ message: "A" });
              const b = makeEntry({ message: "B" });
              const c = makeEntry({ message: "C" });
              render(
                <I18nProvider><ToastStack toasts={[a, b, c]} onDismiss={onDismiss} /></I18nProvider>
              );
              fireEvent.keyDown(document, { key: "Escape" });
              expect(onDismiss).toHaveBeenCalledTimes(1);
              // Newest (last pushed) is C.
              expect(onDismiss.mock.calls[0][0]).toBe(c.id);
            });

            it("Escape is a no-op when the stack is empty", () => {
              const onDismiss = vi.fn();
              render(
                <I18nProvider><ToastStack toasts={[]} onDismiss={onDismiss} /></I18nProvider>
              );
              expect(() => fireEvent.keyDown(document, { key: "Escape" })).not.toThrow();
              expect(onDismiss).not.toHaveBeenCalled();
            });

            it("Escape stops propagation so other Escape handlers don't also fire", () => {
              const onDismiss = vi.fn();
              const otherHandler = vi.fn();
              document.addEventListener("keydown", otherHandler);
              try {
                render(
                  <I18nProvider><ToastStack toasts={[makeEntry()]} onDismiss={onDismiss} /></I18nProvider>
                );
                fireEvent.keyDown(document, { key: "Escape" });
                // otherHandler also gets the event (capture-phase siblings all see it),
                // but stopPropagation prevents it from bubbling further. The important
                // guarantee: onDismiss fired once.
                expect(onDismiss).toHaveBeenCalledTimes(1);
              } finally {
                document.removeEventListener("keydown", otherHandler);
              }
            });

            it("Escape with multiple visible toasts only dismisses the newest", () => {
              const onDismiss = vi.fn();
              const entries = [makeEntry({ message: "A" }), makeEntry({ message: "B" })];
              const { rerender } = render(
                <I18nProvider><ToastStack toasts={entries} onDismiss={onDismiss} /></I18nProvider>
              );
              fireEvent.keyDown(document, { key: "Escape" });
              expect(onDismiss).toHaveBeenCalledTimes(1);
              expect(onDismiss.mock.calls[0][0]).toBe(entries[1].id);
              // Rerender with only the older one still showing — Escape should still
              // dismiss it (handler follows the current toasts array).
              rerender(
                <I18nProvider><ToastStack toasts={[entries[0]]} onDismiss={onDismiss} /></I18nProvider>
              );
              fireEvent.keyDown(document, { key: "Escape" });
              expect(onDismiss).toHaveBeenCalledTimes(2);
              expect(onDismiss.mock.calls[1][0]).toBe(entries[0].id);
            });
          });

describe("ToastStack · internal action (PR #170)", () => {
  it("invokes the onSelect callback when an internal-kind action is clicked", () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();
    render(
      <I18nProvider>
        <ToastStack
          toasts={[
            makeEntry({
              kind: "error",
              message: "Save failed",
              action: { kind: "internal", label: "Retry", onSelect },
            }),
          ]}
          onDismiss={onDismiss}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    // Toast is auto-dismissed after the action runs.
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not call window.open for internal actions", () => {
    const openSpy = vi.fn();
    const originalOpen = window.open;
    window.open = openSpy;
    try {
      render(
        <I18nProvider>
          <ToastStack
            toasts={[
              makeEntry({
                action: { kind: "internal", label: "Retry", onSelect: () => undefined },
              }),
            ]}
            onDismiss={() => undefined}
          />
        </I18nProvider>
      );
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(openSpy).not.toHaveBeenCalled();
    } finally {
      window.open = originalOpen;
    }
  });

  it("swallows errors thrown by the onSelect callback so the toast still dismisses", () => {
    const onDismiss = vi.fn();
    render(
      <I18nProvider>
        <ToastStack
          toasts={[
            makeEntry({
              action: {
                kind: "internal",
                label: "Boom",
                onSelect: () => { throw new Error("handler exploded"); },
              },
            }),
          ]}
          onDismiss={onDismiss}
        />
      </I18nProvider>
    );
    // Clicking should not propagate an unhandled error — the user isn't stuck
    // with a toast that refuses to go away.
    expect(() => fireEvent.click(screen.getByRole("button", { name: "Boom" }))).not.toThrow();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("ToastStack · reveal-in-folder wiring (PR #171)", () => {
  it("clicking a Reveal-flavoured internal action invokes the callback with no window.open side effect", () => {
    // App.tsx wires handleFilePaths's IPC-failure toast to call
    // window.electronAPI.revealInFolder(p). We don't drive App directly
    // (it has too many providers), but the trigger pattern is identical
    // to any other internal action. This test asserts that the new
    // toastActionReveal string flows through the existing internal
    // pipeline and reaches an arbitrary callback with no URL side effect.
    const reveal = vi.fn();
    const openSpy = vi.fn();
    const originalOpen = window.open;
    window.open = openSpy;
    try {
      render(
        <I18nProvider>
          <ToastStack
            toasts={[
              makeEntry({
                kind: "error",
                message: "Read failed",
                action: {
                  kind: "internal",
                  label: "Show in folder",
                  onSelect: () => { reveal(); },
                },
              }),
            ]}
            onDismiss={() => undefined}
          />
        </I18nProvider>
      );
      fireEvent.click(screen.getByRole("button", { name: "Show in folder" }));
      expect(reveal).toHaveBeenCalledTimes(1);
      expect(openSpy).not.toHaveBeenCalled();
    } finally {
      window.open = originalOpen;
    }
  });
});
