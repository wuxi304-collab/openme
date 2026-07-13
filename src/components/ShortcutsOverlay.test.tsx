// @vitest-environment jsdom
// Behavioural tests for the global <ShortcutsOverlay>: open/close via
// the close button, Esc, and backdrop click. Also asserts that the
// i18n wiring renders all three groups and their entries.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ShortcutsOverlay } from "./ShortcutsOverlay";
import { I18nProvider } from "../i18n";

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

beforeEach(() => {
  // Default to en for these tests — substring filter assertions are
  // locale-sensitive ("tab" matches English labels but not the zh ones).
  try { window.localStorage.setItem("openme.lang", "en"); } catch {}
});

describe("ShortcutsOverlay", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <I18nProvider><ShortcutsOverlay open={false} onClose={() => undefined} /></I18nProvider>
    );
    expect(container.querySelector(".shortcuts-overlay")).toBeNull();
  });

  it("renders the three groups with their entries when open", () => {
    render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    // Groups appear in order: Files, Tabs, Application.
    const groupTitles = screen.getAllByRole("heading", { level: 3 });
    expect(groupTitles).toHaveLength(3);
    // Each entry has a kbd and a localised label.
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(9);
    expect(screen.getByText("Ctrl O")).toBeTruthy();
    expect(screen.getByText("Ctrl S")).toBeTruthy();
    expect(screen.getByText("Ctrl K")).toBeTruthy();
    expect(screen.getByText("Alt 1-9")).toBeTruthy();
    expect(screen.getByText("?")).toBeTruthy();
    expect(screen.getByText("Esc")).toBeTruthy();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <I18nProvider><ShortcutsOverlay open onClose={onClose} /></I18nProvider>
    );
    const close = screen.getByRole("button", { name: /Close shortcuts panel|\u5173\u95ed\u5feb\u6377\u952e\u9762\u677f/ });
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <I18nProvider><ShortcutsOverlay open onClose={onClose} /></I18nProvider>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <I18nProvider><ShortcutsOverlay open onClose={onClose} /></I18nProvider>
    );
    const backdrop = container.querySelector(".shortcuts-overlay-backdrop") as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses the localised group titles when language is English", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    const titles = Array.from(document.querySelectorAll(".shortcuts-group-name")).map((n) => n.textContent);
    expect(titles).toEqual(["Files", "Tabs", "Application"]);
  });

  // PR #115 — focus trap and prior-focus restoration
  it("focuses the close button on open (PR #115 focus trap)", () => {
    render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    const closeBtn = document.querySelector(".shortcuts-overlay-close") as HTMLButtonElement | null;
    expect(closeBtn).toBeTruthy();
    expect(document.activeElement).toBe(closeBtn);
  });

  it("Tab from the last focusable wraps back to the first (PR #115, PR #168)", () => {
      render(
        <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
      );
      const searchInput = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
      const closeBtn = document.querySelector(".shortcuts-overlay-close") as HTMLButtonElement;
      // DOM order puts closeBtn before searchInput (close in header), so
      // searchInput is the last focusable. Pressing Tab on it should wrap to
      // the first focusable (closeBtn).
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
      fireEvent.keyDown(window, { key: "Tab" });
      expect(document.activeElement).toBe(closeBtn);
    });

    it("Shift+Tab from the first focusable wraps to the last (PR #115, PR #168)", () => {
      render(
        <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
      );
      const closeBtn = document.querySelector(".shortcuts-overlay-close") as HTMLButtonElement;
      const searchInput = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);
      fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(searchInput);
    });

    it("restores focus to the previously focused element on close (PR #115)", () => {
    const outsideBtn = document.createElement("button");
    outsideBtn.textContent = "Outside";
    document.body.appendChild(outsideBtn);
    outsideBtn.focus();
    expect(document.activeElement).toBe(outsideBtn);
    const { rerender } = render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    const closeBtn = document.querySelector(".shortcuts-overlay-close") as HTMLButtonElement;
    expect(document.activeElement).toBe(closeBtn);
    rerender(
      <I18nProvider><ShortcutsOverlay open={false} onClose={() => undefined} /></I18nProvider>
    );
    expect(document.activeElement).toBe(outsideBtn);
    outsideBtn.remove();
  });

      // PR #168 — search/filter overlay polish
      describe("search/filter (PR #168)", () => {
        it("renders a search input with placeholder and aria-label", () => {
          render(
            <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
          );
          const input = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
          expect(input).toBeTruthy();
          expect(input.type).toBe("search");
          expect(input.placeholder).toBeTruthy();
          expect(input.getAttribute("aria-label")).toBeTruthy();
        });

        it("filtering by label substring keeps only matching rows", () => {
          render(
            <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
          );
          const input = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
          fireEvent.change(input, { target: { value: "tab" } });
          // 'Next tab' / 'Previous tab' / 'Jump to a specific tab' / 'Close current tab'
          const items = screen.getAllByRole("listitem");
          expect(items.length).toBeGreaterThanOrEqual(3);
          expect(items.length).toBeLessThan(9);
        });

        it("filtering by key substring (Ctrl) shows all entries with Ctrl", () => {
          render(
            <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
          );
          const input = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
          fireEvent.change(input, { target: { value: "Ctrl" } });
          // Files: Ctrl O, Ctrl S. Tabs: Ctrl Tab, Ctrl Shift Tab, Ctrl W. App: Ctrl K.
          // = 6 entries (Alt 1-9 and the single-key App entries don't contain "Ctrl")
          const items = screen.getAllByRole("listitem");
          expect(items.length).toBe(6);
        });

        it("search with no matches shows no-results state and hides the body", () => {
          render(
            <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
          );
          const input = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
          fireEvent.change(input, { target: { value: "zzz-no-match" } });
          const noResults = document.querySelector(".shortcuts-overlay-no-results");
          expect(noResults).toBeTruthy();
          expect(document.querySelector(".shortcuts-overlay-body")).toBeNull();
        });

        it("summary shows full count when query is empty", () => {
          render(
            <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
          );
          const summary = document.querySelector(".shortcuts-overlay-summary") as HTMLElement;
          expect(summary.textContent).toMatch(/9/);
        });

        it("summary updates with shown/total after filtering", () => {
          render(
            <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
          );
          const input = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
          fireEvent.change(input, { target: { value: "Ctrl" } });
          const summary = document.querySelector(".shortcuts-overlay-summary") as HTMLElement;
          expect(summary.textContent).toMatch(/6/);
          expect(summary.textContent).toMatch(/9/);
        });

        it("Escape inside the search input clears the filter, second Escape closes (PR #163 contract)", () => {
          const onClose = vi.fn();
          render(
            <I18nProvider><ShortcutsOverlay open onClose={onClose} /></I18nProvider>
          );
          const input = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
          fireEvent.change(input, { target: { value: "tab" } });
          expect(input.value).toBe("tab");
          fireEvent.keyDown(input, { key: "Escape" });
          // Filter cleared, dialog NOT closed
          expect(input.value).toBe("");
          expect(onClose).not.toHaveBeenCalled();
          // Second Escape (now from anywhere) closes
          fireEvent.keyDown(window, { key: "Escape" });
          expect(onClose).toHaveBeenCalledTimes(1);
        });

        it("'/' key focuses the search input", () => {
          render(
            <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
          );
          const input = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
          // Move focus away from the input first (e.g. to close button via Tab is not needed)
          const closeBtn = document.querySelector(".shortcuts-overlay-close") as HTMLButtonElement;
          closeBtn.focus();
          expect(document.activeElement).toBe(closeBtn);
          fireEvent.keyDown(window, { key: "/" });
          expect(document.activeElement).toBe(input);
        });

        it("'/' is ignored when typed inside another input", () => {
          render(
            <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
          );
          const input = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
          input.focus();
          // Pre-fill so we can see '/' appended
          fireEvent.change(input, { target: { value: "" } });
          fireEvent.keyDown(input, { key: "/" });
          // The handler should NOT re-focus (we're already in the input) — no-op
          expect(document.activeElement).toBe(input);
        });

        it("query resets when the overlay closes and reopens", () => {
          const { rerender } = render(
            <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
          );
          const input = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
          fireEvent.change(input, { target: { value: "tab" } });
          expect(input.value).toBe("tab");
          rerender(
            <I18nProvider><ShortcutsOverlay open={false} onClose={() => undefined} /></I18nProvider>
          );
          rerender(
            <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
          );
          const inputAfter = document.querySelector(".shortcuts-overlay-search-input") as HTMLInputElement;
          expect(inputAfter.value).toBe("");
        });
      });
    });