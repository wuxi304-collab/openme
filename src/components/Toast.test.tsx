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
      vi.advanceTimersByTime(999);
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
});
