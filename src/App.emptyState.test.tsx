// @vitest-environment jsdom
// Behavioural tests for the EmptyState hero block (rendered when no
// tabs are open). Covers i18n wiring, the keyboard-shortcut card, the
// recent-files card, and the i18n-driven eyebrow/mark labels.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { EmptyState } from "./App";
import { I18nProvider, useI18n } from "./i18n";
import type { FileInfo } from "./types";

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

beforeEach(() => {
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

const recentFile = (overrides: Partial<FileInfo>): FileInfo => ({
  id: "id-1",
  path: "/tmp/report.pdf",
  name: "report.pdf",
  extension: ".pdf",
  size: 1024,
  modified_at: "2026-07-01T10:00:00Z",
  file_type: "pdf",
  opened_at: "2026-07-09T10:00:00Z",
  ...overrides,
});

function renderEmpty(propsOverride: Partial<React.ComponentProps<typeof EmptyState>> = {}) {
  const onOpenDialog = vi.fn();
  const onOpenRecent = vi.fn();
  const utils = render(
    <I18nProvider>
      <EmptyState onOpenDialog={onOpenDialog} recentFiles={[]} onOpenRecent={onOpenRecent} {...propsOverride} />
    </I18nProvider>
  );
  return { ...utils, onOpenDialog, onOpenRecent };
}

describe("EmptyState hero block", () => {
  it("renders a labelled region with the localized hero title", () => {
    renderEmpty();
    const region = screen.getByRole("region", { hidden: true }) ?? document.querySelector("section.empty-workspace");
    expect(region).toBeTruthy();
    // Default lang is zh — title is "打开文件，先看懂边界".
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/打开文件/);
  });

  it("uses the i18n strings for the eyebrow and OM mark (not the hardcoded 'OPENME WORKSPACE' / 'OM')", () => {
    renderEmpty();
    // Eyebrow line is wrapped in a <div> with class welcome-eyebrow.
    const eyebrow = document.querySelector(".welcome-eyebrow");
    expect(eyebrow?.textContent).toMatch(/OPENME WORKSPACE/);
    // The hero mark span is the visible "OM" — it should be present in the
    // dictionary (heroMark) and render through t() rather than a literal.
    const mark = document.querySelector(".hero-mark span");
    expect(mark?.textContent).toBe("OM");
  });

  it("renders the four keyboard-shortcut rows", () => {
    renderEmpty();
    const list = screen.getByRole("list", { hidden: true }) ?? document.querySelector(".empty-shortcuts");
    expect(list).toBeTruthy();
    const items = list ? list.querySelectorAll("li") : [];
    expect(items.length).toBe(4);
    // Each row has a kbd + label
    expect(items[0]?.querySelector("kbd")?.textContent).toBe("Ctrl O");
    expect(items[1]?.querySelector("kbd")?.textContent).toBe("Ctrl K");
    expect(items[2]?.querySelector("kbd")?.textContent).toBe("Ctrl S");
    expect(items[3]?.querySelector("kbd")?.textContent).toBe("Drag");
  });

  it("calls onOpenDialog when the hero Open button is clicked", () => {
    const { onOpenDialog } = renderEmpty();
    const button = screen.getByRole("button", { name: /选择文件/ });
    act(() => { fireEvent.click(button); });
    expect(onOpenDialog).toHaveBeenCalledTimes(1);
  });

  it("renders the recent-files empty-state copy when no recents exist", () => {
    renderEmpty({ recentFiles: [] });
    expect(screen.getByText(/还没有最近文件/)).toBeTruthy();
  });

  it("renders up to four recent files as clickable rows", () => {
    const recents = [
      recentFile({ id: "1", path: "/p/a.pdf", name: "a.pdf" }),
      recentFile({ id: "2", path: "/p/b.txt", name: "b.txt", extension: ".txt", file_type: "text" }),
      recentFile({ id: "3", path: "/p/c.dwg", name: "c.dwg", extension: ".dwg", file_type: "dwg" }),
      recentFile({ id: "4", path: "/p/d.zip", name: "d.zip", extension: ".zip", file_type: "archive" }),
      recentFile({ id: "5", path: "/p/e.mp3", name: "e.mp3", extension: ".mp3", file_type: "audio" }),
    ];
    renderEmpty({ recentFiles: recents });
    const list = document.querySelector(".empty-recent-list");
    expect(list).toBeTruthy();
    const rows = list ? list.querySelectorAll("button.empty-recent-row") : [];
    expect(rows.length).toBe(4); // slice(0, 4) enforced
    expect(rows[0]?.textContent).toMatch(/a\.pdf/);
    expect(rows[3]?.textContent).toMatch(/d\.zip/);
  });

  it("calls onOpenRecent with the matching file when a recent row is clicked", () => {
    const a = recentFile({ id: "1", path: "/p/a.pdf", name: "a.pdf" });
    const b = recentFile({ id: "2", path: "/p/b.txt", name: "b.txt" });
    const { onOpenRecent } = renderEmpty({ recentFiles: [a, b] });
    const buttons = document.querySelectorAll<HTMLButtonElement>(".empty-recent-row");
    act(() => { fireEvent.click(buttons[1]!); });
    expect(onOpenRecent).toHaveBeenCalledTimes(1);
    expect(onOpenRecent).toHaveBeenCalledWith(b);
  });

  it("shows the extension as an uppercased chip (without leading dot)", () => {
    renderEmpty({ recentFiles: [recentFile({ extension: ".pdf" })] });
    const ext = document.querySelector(".empty-recent-ext");
    expect(ext?.textContent).toBe("PDF");
  });

  it("switches all copy to English when the language is set to en", () => {
    function Flipper() {
      const { setLang } = useI18n();
      return <button type="button" data-testid="set-en" onClick={() => setLang("en")}>EN</button>;
    }
    render(
      <I18nProvider>
        <Flipper />
        <EmptyState onOpenDialog={() => undefined} recentFiles={[]} onOpenRecent={() => undefined} />
      </I18nProvider>
    );
    act(() => { fireEvent.click(screen.getByTestId("set-en")); });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Open a file/);
    expect(screen.getByText(/Pick files/)).toBeTruthy();
  });
});
