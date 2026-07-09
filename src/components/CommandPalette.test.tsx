// @vitest-environment jsdom
// Behavioural tests for the command palette component itself (the
// paletteKind* translation coverage lives in i18n.paletteKind.test.tsx).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import CommandPalette, { type CommandItem } from "./CommandPalette";
import { I18nProvider } from "../i18n";

beforeEach(() => {
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
  vi.useRealTimers();
});

const sampleCommands: CommandItem[] = [
  { id: "open", label: "Open file", detail: "Pick a file", kind: "file", run: vi.fn() },
  { id: "save", label: "Save current", detail: "Write changes", kind: "file", run: vi.fn() },
  { id: "tab-1", label: "Switch tab: report.pdf", detail: "/path/to/report.pdf", kind: "tab", run: vi.fn() },
  {
    id: "recent-1",
    label: "Open recent: report.pdf",
    detail: "/path/to/report.pdf",
    kind: "recent",
    openedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    run: vi.fn(),
  },
  {
    id: "recent-2",
    label: "Open recent: notes.txt",
    detail: "/path/to/notes.txt",
    kind: "recent",
    openedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    run: vi.fn(),
  },
];

function renderPalette(propsOverride: Partial<React.ComponentProps<typeof CommandPalette>> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <I18nProvider>
      <CommandPalette open={true} commands={sampleCommands} onClose={onClose} {...propsOverride} />
    </I18nProvider>
  );
  return { ...utils, onClose };
}

describe("CommandPalette rendering", () => {
  it("renders a list of all commands when query is empty", () => {
    renderPalette();
    expect(screen.getAllByRole("option")).toHaveLength(sampleCommands.length);
  });

  it("filters by fuzzy match", () => {
    renderPalette();
    const input = screen.getByRole("textbox", { hidden: true });
    act(() => { fireEvent.change(input, { target: { value: "xyzqq" } }); });
    // "xyzqq" doesn't substring-match any label, so the ranker drops
    // everything. The empty state copy should render.
    const list = screen.getByRole("listbox");
    expect(within(list).queryAllByRole("option")).toHaveLength(0);
    // Default lang is zh; copy is "没有匹配的命令".
    expect(screen.getByText(/没有匹配的命令/)).toBeTruthy();
  });

  it("filters with a token that has a real substring hit", () => {
    renderPalette();
    const input = screen.getByRole("textbox", { hidden: true });
    act(() => { fireEvent.change(input, { target: { value: "save" } }); });
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toMatch(/Save current/);
  });

  it("calls onClose on Escape", () => {
    const { onClose } = renderPalette();
    const input = screen.getByRole("textbox", { hidden: true });
    act(() => { fireEvent.keyDown(input, { key: "Escape" }); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls command.run on Enter", () => {
    renderPalette();
    const input = screen.getByRole("textbox", { hidden: true });
    act(() => { fireEvent.keyDown(input, { key: "Enter" }); });
    // Default selected is index 0 → "Open file"
    const openCommand = sampleCommands[0];
    expect(openCommand && "run" in openCommand ? (openCommand.run as ReturnType<typeof vi.fn>) : null).toHaveBeenCalledTimes(1);
  });

  it("renders a relative-time tag for recent commands", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-09T12:00:00Z"));
    const commands: CommandItem[] = [
      { id: "recent-fresh", label: "Open recent: fresh.txt", detail: "/p", kind: "recent", openedAt: "2026-07-09T11:59:30Z", run: vi.fn() },
      { id: "recent-yesterday", label: "Open recent: yesterday.txt", detail: "/p", kind: "recent", openedAt: "2026-07-08T06:00:00Z", run: vi.fn() },
    ];
    renderPalette({ commands });
    // Default lang is zh — "刚刚" for justNow, "昨天" for yesterday bucket.
    expect(screen.getByText(/刚刚/)).toBeTruthy();
    expect(screen.getByText(/昨天/)).toBeTruthy();
  });

  it("does not render a relative-time tag for non-recent kinds", () => {
    // Use a sample with no recent commands at all so the "minutes ago"
    // substring only appears in the kind tag.
    const commands: CommandItem[] = [
      { id: "open", label: "Open file", detail: "Pick", kind: "file", run: vi.fn() },
      { id: "save", label: "Save current", detail: "Write", kind: "file", run: vi.fn() },
    ];
    renderPalette({ commands });
    const list = screen.getByRole("listbox");
    expect(within(list).queryByText(/分钟前|小时前|天前|周前|个月前/)).toBeNull();
  });

    it("highlights matched substrings inside the active label and detail", () => {
      const { container } = renderPalette();
      const input = screen.getByRole("textbox", { hidden: true });
      act(() => { fireEvent.change(input, { target: { value: "save" } }); });
      // Lowercase query matches "Save current" case-insensitively. The
      // matched range should render as a <mark class="command-palette-mark">.
      const marks = container.querySelectorAll(".command-palette-mark");
      expect(marks.length).toBeGreaterThan(0);
      expect(marks[0]?.textContent?.toLowerCase()).toBe("save");
    });

    it("renders the query-length hint only when the user has typed something", () => {
      const { container } = renderPalette();
      expect(container.querySelector(".command-palette-query-meta")).toBeNull();
      const input = screen.getByRole("textbox", { hidden: true });
      act(() => { fireEvent.change(input, { target: { value: "op" } }); });
      expect(screen.getByText("已输入 2 个字符")).toBeTruthy();
    });

    it("uses English query-length copy under en locale", () => {
      try { window.localStorage.setItem("openme.lang", "en"); } catch {}
      renderPalette();
      const input = screen.getByRole("textbox", { hidden: true });
      act(() => { fireEvent.change(input, { target: { value: "op" } }); });
      expect(screen.getByText("2 characters typed")).toBeTruthy();
    });
  });
