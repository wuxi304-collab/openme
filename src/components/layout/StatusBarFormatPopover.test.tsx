// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import StatusBarFormatPopover from "./StatusBarFormatPopover";
import type { FileFormatDefinition } from "../../file-registry";

const format: FileFormatDefinition = {
  id: "psd",
  name: "Adobe Photoshop",
  category: "image",
  extensions: [".psd"],
  supportLevel: "D",
  openStrategy: "external",
  riskLevel: "low",
  mimeTypes: ["image/vnd.adobe.photoshop"],
};

function makeAnchor(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "trigger";
  document.body.appendChild(btn);
  return btn;
}

function renderPopover(overrides: Partial<Parameters<typeof StatusBarFormatPopover>[0]> = {}) {
  const anchor = makeAnchor();
  const onClose = vi.fn();
  const onOpenInSystem = vi.fn();
  const result = render(
    <I18nProvider>
      <StatusBarFormatPopover
        anchor={anchor}
        format={format}
        filePath="C:\\files\\photo.psd"
        extension=".psd"
        openStrategy="external"
        riskLevel="low"
        category="image"
        onClose={onClose}
        onOpenInSystem={onOpenInSystem}
        {...overrides}
      />
    </I18nProvider>,
  );
  return { ...result, anchor, onClose, onOpenInSystem };
}

describe("StatusBarFormatPopover", () => {
  afterEach(() => cleanup());

  it("renders with the dialog title and close button", () => {
    const { getByRole, unmount } = renderPopover();
    const dialog = getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBeTruthy();
    expect(getByRole("button", { name: "关闭" })).toBeTruthy();
    unmount();
  });

  it("auto-focuses the first focusable element on mount", async () => {
    const { getAllByRole, unmount } = renderPopover();
    await waitFor(() => {
      // Photoshop → suggested app is Photopea. The first focusable button in the
      // popover is either the per-app button or the action button — whichever
      // appears first in tab order. Either is fine; we only assert that focus
      // landed inside the dialog (i.e. NOT the body / trigger).
      const active = document.activeElement;
      expect(active).not.toBe(document.body);
      expect(active?.closest('[role="dialog"]')).not.toBeNull();
    });
    // Sanity: multiple focusable buttons exist
    expect(getAllByRole("button").length).toBeGreaterThan(1);
    unmount();
  });

  it("Tab from the last focusable wraps back to the first (focus trap)", async () => {
    const { unmount } = renderPopover();
    await waitFor(() => {
      expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
    });
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
    );
    expect(focusables.length).toBeGreaterThanOrEqual(2);
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    const first = focusables[0];
    expect(document.activeElement).toBe(first);
    unmount();
  });

  it("Shift+Tab from the first focusable wraps to the last (focus trap)", async () => {
    const { unmount } = renderPopover();
    await waitFor(() => {
      expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
    });
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
    );
    const first = focusables[0];
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    const last = focusables[focusables.length - 1];
    expect(document.activeElement).toBe(last);
    unmount();
  });

  it("Escape closes and restores focus to the anchor", async () => {
    const { anchor, onClose, unmount } = renderPopover();
    await waitFor(() => {
      expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(document.activeElement).toBe(anchor);
    });
    unmount();
  });

  it("clicking the close button closes and restores focus to the anchor", async () => {
    const { anchor, getByRole, onClose, unmount } = renderPopover();
    await waitFor(() => {
      expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
    });
      fireEvent.click(getByRole("button", { name: "关闭" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(document.activeElement).toBe(anchor);
    });
    unmount();
  });

  it("outside mousedown closes and restores focus to the anchor", async () => {
    const { anchor, onClose, unmount } = renderPopover();
    await waitFor(() => {
      expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
    });
    const outside = document.createElement("div");
    document.body.appendChild(outside);
    fireEvent.mouseDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(document.activeElement).toBe(anchor);
    });
    document.body.removeChild(outside);
    unmount();
  });
});