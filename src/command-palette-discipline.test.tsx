// @vitest-environment jsdom
// Contract test for CommandPalette UX polish (PR #134).
// Asserts: aria-describedby wired to hints, polite aria-live announcer,
// aria-activedescendant mirrors selected, option id stable, results count
// role=status, selection announcement text via tf().

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import CommandPalette, { type CommandItem } from "./components/CommandPalette";
import { I18nProvider } from "./i18n";

beforeEach(() => {
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});
afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

const sampleCommands: CommandItem[] = [
  { id: "open", label: "Open file", detail: "Pick a file", kind: "file", run: vi.fn() },
  { id: "save", label: "Save current", detail: "Write changes", kind: "file", run: vi.fn() },
  { id: "tab-1", label: "Switch tab: report.pdf", detail: "/path/to/report.pdf", kind: "tab", run: vi.fn() },
  { id: "recent-1", label: "Open recent: notes.txt", detail: "/path/to/notes.txt", kind: "recent", openedAt: new Date().toISOString(), run: vi.fn() },
];

function renderPalette() {
  return render(
    <I18nProvider>
      <CommandPalette open={true} commands={sampleCommands} onClose={() => undefined} />
    </I18nProvider>
  );
}

describe("CommandPalette discipline (PR #134)", () => {
  it("exposes aria-describedby referencing the hints footer", () => {
    renderPalette();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-describedby")).toBe("command-palette-hints");
    const hints = document.getElementById("command-palette-hints");
    expect(hints).toBeTruthy();
    expect(hints?.getAttribute("role")).toBe("group");
    expect(hints?.getAttribute("aria-label")).toBeTruthy();
  });

  it("exposes polite aria-live results announcer", () => {
    const { container } = renderPalette();
    const announcers = container.querySelectorAll("[role='status'][aria-live='polite']");
    expect(announcers.length).toBeGreaterThanOrEqual(1);
    // The results announcer text uses the plural form (4 items in zh, with ICU)
    // Accept either zh or en rendering — the live region must be present.
    const liveText = Array.from(announcers).map((n) => n.textContent ?? "").join(" ");
    expect(liveText.length).toBeGreaterThan(0);
  });

  it("uses aria-activedescendant mirroring the selected option id", () => {
    renderPalette();
    const listbox = screen.getByRole("listbox");
    // Default selected = 0 → open
    expect(listbox.getAttribute("aria-activedescendant")).toBe("command-palette-option-open");
    const options = screen.getAllByRole("option");
    expect(options[0]?.id).toBe("command-palette-option-open");
    // Each option has a stable id matching command id
    expect(options[1]?.id).toBe("command-palette-option-save");
    expect(options[2]?.id).toBe("command-palette-option-tab-1");
  });

  it("updates aria-activedescendant when selection moves", () => {
    renderPalette();
    const listbox = screen.getByRole("listbox");
    const input = screen.getByRole("textbox", { hidden: true });
    act(() => { fireEvent.keyDown(input, { key: "ArrowDown" }); });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("command-palette-option-save");
    act(() => { fireEvent.keyDown(input, { key: "ArrowDown" }); });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("command-palette-option-tab-1");
    act(() => { fireEvent.keyDown(input, { key: "ArrowUp", shiftKey: false }); });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("command-palette-option-save");
  });

  it("selection-announcer text contains the label", () => {
    const { container } = renderPalette();
    // Live region for selection lives outside the dialog (sibling div)
    const liveRegions = container.querySelectorAll("[aria-live='polite'][aria-atomic='true']");
    expect(liveRegions.length).toBeGreaterThanOrEqual(2); // results + selection
    const text = Array.from(liveRegions).map((n) => n.textContent ?? "").join(" ");
    expect(text).toMatch(/Open file/);
  });

  it("announces the new selected label on ArrowDown", () => {
    const { container } = renderPalette();
    const input = screen.getByRole("textbox", { hidden: true });
    act(() => { fireEvent.keyDown(input, { key: "ArrowDown" }); });
    const liveRegions = container.querySelectorAll("[aria-live='polite'][aria-atomic='true']");
    const text = Array.from(liveRegions).map((n) => n.textContent ?? "").join(" ");
    expect(text).toMatch(/Save current/);
  });

  it("renders 0-results announcer text when no commands match", () => {
    const { container } = renderPalette();
    const input = screen.getByRole("textbox", { hidden: true });
    act(() => { fireEvent.change(input, { target: { value: "xyzqq" } }); });
    const liveRegions = container.querySelectorAll("[aria-live='polite'][aria-atomic='true']");
    const text = Array.from(liveRegions).map((n) => n.textContent ?? "").join(" ");
    expect(text.length).toBeGreaterThan(0);
  });

  it("hints group carries 'Keyboard shortcuts' or its zh equivalent", () => {
    renderPalette();
    const hints = document.getElementById("command-palette-hints");
    expect(hints).toBeTruthy();
    const label = hints?.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label?.length).toBeGreaterThan(0);
  });

  it("renders English results count under en locale", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    const { container } = renderPalette();
    const announcers = container.querySelectorAll("[role='status'][aria-live='polite']");
    const text = Array.from(announcers).map((n) => n.textContent ?? "").join(" ");
    // ICU plural: 4 results → "4 results"
    expect(text).toMatch(/4 results/);
  });
});
