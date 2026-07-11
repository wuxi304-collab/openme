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
  try { window.localStorage.removeItem("openme.lang"); } catch {}
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

  it("Tab from the last focusable wraps back to the first (PR #115)", () => {
    render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    const closeBtn = document.querySelector(".shortcuts-overlay-close") as HTMLButtonElement;
    closeBtn.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    // Wraps: focus stays on the only focusable element
    expect(document.activeElement).toBe(closeBtn);
  });

  it("Shift+Tab from the first focusable wraps to the last (PR #115)", () => {
    render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    const closeBtn = document.querySelector(".shortcuts-overlay-close") as HTMLButtonElement;
    closeBtn.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(closeBtn);
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
});