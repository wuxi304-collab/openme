// @vitest-environment jsdom
// Contract test for the ShortcutsOverlay polish (PR #133).
// Asserts list semantics, kbd variants, count badge, group aria, missing key fix.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ShortcutsOverlay } from "./components/ShortcutsOverlay";
import { I18nProvider } from "./i18n";

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});
beforeEach(() => {
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

describe("ShortcutsOverlay discipline (PR #133)", () => {
  it("renders groups as <ul role='list'> not <table>", () => {
    const { container } = render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    const lists = container.querySelectorAll(".shortcuts-group-list");
    expect(lists.length).toBe(3);
    expect(container.querySelector(".shortcuts-group-table")).toBeNull();
    // Each group has 3-4 entries
    expect(screen.getAllByRole("listitem").length).toBe(9);
  });

  it("renders a count badge per group with zh/en copy", () => {
    render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    // 3 groups with 2/4/3 entries → 2 项 / 4 项 / 3 项
    const badges = screen.getAllByText(/项/);
    expect(badges.length).toBe(3);
  });

  it("renders the English count badge when locale is en", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    expect(screen.getAllByText(/\d+ shortcuts/).length).toBe(3);
  });

  it("marks single-key entries (? Esc) with shortcuts-kbd-single class", () => {
    const { container } = render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    const single = container.querySelectorAll(".shortcuts-kbd-single");
    expect(single.length).toBe(2); // ? + Esc
    // Combo keys should NOT have the single class
    const combos = container.querySelectorAll(".shortcuts-kbd:not(.shortcuts-kbd-single)");
    expect(combos.length).toBe(7); // 9 total - 2 single
  });

  it("exposes single-key aria-label including 'single key' or '单键' hint", () => {
    render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    const quest = screen.getByLabelText(/\? .*单键/);
    expect(quest).toBeTruthy();
    const esc = screen.getByLabelText(/Esc .*单键/);
    expect(esc).toBeTruthy();
  });

  it("exposes single-key aria-label in English", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    const quest = screen.getByLabelText(/\? .*\(single key\)/);
    expect(quest).toBeTruthy();
    const esc = screen.getByLabelText(/Esc .*\(single key\)/);
    expect(esc).toBeTruthy();
  });

  it("uses aria-label for each group section with count", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    const { container } = render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    const sections = container.querySelectorAll("section.shortcuts-group");
    expect(sections.length).toBe(3);
    const labels = Array.from(sections).map((s) => s.getAttribute("aria-label"));
    expect(labels.some((l) => l?.includes("Files") && l.includes("2 items"))).toBe(true);
    expect(labels.some((l) => l?.includes("Tabs") && l.includes("4 items"))).toBe(true);
    expect(labels.some((l) => l?.includes("Application") && l.includes("3 items"))).toBe(true);
  });

  it("uses listitem role for entries (not row)", () => {
    render(
      <I18nProvider><ShortcutsOverlay open onClose={() => undefined} /></I18nProvider>
    );
    expect(screen.queryByRole("row")).toBeNull();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(9);
  });
});
