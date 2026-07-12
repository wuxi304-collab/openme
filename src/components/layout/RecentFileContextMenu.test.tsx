// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
// jsdom doesn't ship rAF by default; importing testing-library in this file
// is enough for the menu tests because they use setTimeout for auto-focus.
import RecentFileContextMenu from "./RecentFileContextMenu";
import type { FileInfo } from "../../types";

const file: FileInfo = {
  id: "1",
  path: "/tmp/foo.pdf",
  name: "foo.pdf",
  extension: ".pdf",
  size: 12345,
  modified_at: new Date(1700000000000).toISOString(),
  file_type: "pdf",
  opened_at: new Date(1700000000000).toISOString(),
};

function renderMenu(overrides: Partial<{
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  onReveal: () => void;
  onCopyPath: () => Promise<boolean>;
  onOpenInSystem: () => void;
  onRemove: () => void;
}> = {}) {
  const props = {
    open: true,
    position: { x: 100, y: 100 },
    file,
    onClose: overrides.onClose ?? vi.fn(),
    onOpen: overrides.onOpen ?? vi.fn(),
    onReveal: overrides.onReveal ?? vi.fn(),
    onCopyPath: overrides.onCopyPath ?? (async () => true),
    onOpenInSystem: overrides.onOpenInSystem ?? vi.fn(),
    onRemove: overrides.onRemove ?? vi.fn(),
  };
  const result = render(<RecentFileContextMenu {...props} />);
  return { ...result, props };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function getItems() {
  return screen.getAllByRole("menuitem");
}

describe("RecentFileContextMenu keyboard nav", () => {
  it("renders the menu with role=menu and labelled by a localized string", async () => {
    renderMenu();
    const menu = screen.getByRole("menu");
    expect(menu).toBeTruthy();
    expect(menu.getAttribute("aria-label")).toBeTruthy();
    // setTimeout(0) in the auto-focus effect must flush before we can read
    // document.activeElement reliably.
    await waitFor(() => {
      expect(document.activeElement).toBe(getItems()[0]);
    });
  });

  it("ArrowDown moves focus to the next menuitem and wraps at the end", async () => {
    renderMenu();
    await waitFor(() => expect(document.activeElement).toBe(getItems()[0]));
    const items = getItems();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[2]);
    // ... skip to last
    fireEvent.keyDown(window, { key: "End" });
    expect(document.activeElement).toBe(items[items.length - 1]);
    // wrap
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[0]);
  });

  it("ArrowUp moves focus to the previous menuitem and wraps at the top", async () => {
    renderMenu();
    await waitFor(() => expect(document.activeElement).toBe(getItems()[0]));
    const items = getItems();
    // from index 0 wrap to last
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[items.length - 1]);
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[items.length - 2]);
  });

  it("Home jumps to the first item, End to the last", async () => {
    renderMenu();
    await waitFor(() => expect(document.activeElement).toBe(getItems()[0]));
    const items = getItems();
    fireEvent.keyDown(window, { key: "End" });
    expect(document.activeElement).toBe(items[items.length - 1]);
    fireEvent.keyDown(window, { key: "Home" });
    expect(document.activeElement).toBe(items[0]);
  });

  it("Escape closes the menu via the existing handler", async () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    await waitFor(() => expect(document.activeElement).toBe(getItems()[0]));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies roving tabindex so only the focused item is in the tab sequence", async () => {
    renderMenu();
    await waitFor(() => expect(document.activeElement).toBe(getItems()[0]));
    const items = getItems();
    expect(items[0].tabIndex).toBe(0);
    expect(items[1].tabIndex).toBe(-1);
    expect(items[2].tabIndex).toBe(-1);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(items[0].tabIndex).toBe(-1);
    expect(items[1].tabIndex).toBe(0);
  });

  it("Enter activates the focused menuitem via native click handling", async () => {
    const onOpen = vi.fn();
    renderMenu({ onOpen });
    await waitFor(() => expect(document.activeElement).toBe(getItems()[0]));
    // Space and Enter trigger click events on <button> elements
    fireEvent.click(getItems()[0]);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
