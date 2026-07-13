// @vitest-environment jsdom
// Contract test for TitleBar a11y polish (PR #135).
// Asserts: state-aware theme aria-label, aria-pressed alignment,
// polite live announcer for theme + maximize, aria-pressed on settings/about.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import TitleBar from "./components/layout/TitleBar";
import { I18nProvider } from "./i18n";
import { ThemeProvider } from "./theme";
import { SettingsProvider } from "./settings";

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
  try { window.localStorage.removeItem("openme.settings.v1"); } catch {}
});
beforeEach(() => {
  try { window.localStorage.removeItem("openme.lang"); } catch {}
  try { window.localStorage.removeItem("openme.settings.v1"); } catch {}
});

function renderTitleBar() {
  return render(
    <I18nProvider>
      <SettingsProvider>
        <ThemeProvider>
          <TitleBar />
        </ThemeProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}

describe("TitleBar discipline (PR #135)", () => {
  it("renders the theme-toggle button with default zh aria-label advertising target state", () => {
    renderTitleBar();
    const btns = document.querySelectorAll("button.theme-toggle");
    expect(btns.length).toBe(1);
    const btn = btns[0] as HTMLButtonElement;
    // Default theme is dark → aria-label should advertise the light target
    expect(btn.getAttribute("aria-label")).toBe("切换到明亮主题");
    // PR #177: native title= replaced by custom Tooltip (no native title attr).
    expect(btn.title).toBe("");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("flips aria-label and aria-pressed when theme is light", () => {
    localStorage.setItem("openme.settings.v1", JSON.stringify({ theme: "light" }));
    renderTitleBar();
    const btn = document.querySelector("button.theme-toggle") as HTMLButtonElement;
    expect(btn.getAttribute("aria-label")).toBe("切换到暗色主题");
    // PR #177: native title= replaced by custom Tooltip.
    expect(btn.title).toBe("");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders English aria-label advertising target state", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    renderTitleBar();
    const btn = document.querySelector("button.theme-toggle") as HTMLButtonElement;
      expect(btn.getAttribute("aria-label")).toBe("Switch to light theme");
  });

  it("theme button click announces the new theme via polite live region", async () => {
    renderTitleBar();
    const btn = document.querySelector("button.theme-toggle") as HTMLButtonElement;
    const liveRegion = document.querySelector(".app-titlebar [aria-live='polite']") as HTMLElement | null;
    expect(liveRegion).toBeTruthy();
    const beforeText = liveRegion?.textContent ?? "";
    expect(beforeText).toBe("");
    await act(async () => { fireEvent.click(btn); });
    const afterText = liveRegion?.textContent ?? "";
    expect(afterText).toMatch(/已切换到/);
  });

  it("English theme button click announces the new theme", async () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    renderTitleBar();
    const btn = document.querySelector("button.theme-toggle") as HTMLButtonElement;
    const liveRegion = document.querySelector(".app-titlebar [aria-live='polite']") as HTMLElement | null;
    await act(async () => { fireEvent.click(btn); });
    expect(liveRegion?.textContent ?? "").toMatch(/Switched to/);
  });

  it("exposes aria-pressed=false on settings button when closed", () => {
    renderTitleBar();
    const btn = document.querySelector(".settings-info-button") as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute("aria-pressed")).toBe("false");
  });

  it("exposes aria-pressed on about button when closed", () => {
    renderTitleBar();
    // The about button is the other .about-info-button that isn't .settings-info-button
    const buttons = document.querySelectorAll(".about-info-button");
    const aboutBtn = Array.from(buttons).find((b) => !b.classList.contains("settings-info-button"));
    expect(aboutBtn).toBeTruthy();
    expect(aboutBtn?.getAttribute("aria-pressed")).toBe("false");
  });

  it("window controls toolbar has aria-label", () => {
    renderTitleBar();
    const toolbar = document.querySelector(".window-controls[role='toolbar']") as HTMLElement | null;
    expect(toolbar).toBeTruthy();
    expect(toolbar?.getAttribute("aria-label")).toBeTruthy();
  });

  it("settings/lang/theme buttons render focusable and have visible class hooks", () => {
    renderTitleBar();
    const buttons = document.querySelectorAll(".window-controls button");
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    buttons.forEach((b) => {
      expect((b as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("renders settings/about/lang buttons under en locale without i18n mismatch", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    renderTitleBar();
    const settingsBtn = document.querySelector(".settings-info-button") as HTMLButtonElement;
    expect(settingsBtn.getAttribute("aria-label")).toBe("Open settings");
  });
});

  describe("TitleBar Tooltip migration (PR #177)", () => {
    it("does not set native title= on the migrated chrome controls", () => {
      renderTitleBar();
      const migratedSelectors = [
        "button.theme-toggle",
        "button.settings-info-button",
        "button.about-info-button:not(.settings-info-button)",
        ".titlebar-publisher",
      ];
      for (const sel of migratedSelectors) {
        const els = Array.from(document.querySelectorAll(sel));
        expect(els.length).toBeGreaterThan(0);
        for (const el of els) {
          // PR #177: native title= replaced by the Tooltip body (aria-describedby
          // on hover). The hover copy still surfaces, just via a styled element.
          expect((el as HTMLElement).title).toBe("");
        }
      }
    });

    it("preserves aria-label on each migrated control (a11y fallback)", () => {
      renderTitleBar();
      const themeBtn = document.querySelector("button.theme-toggle") as HTMLButtonElement;
      const settingsBtn = document.querySelector("button.settings-info-button") as HTMLButtonElement;
      const buttons = document.querySelectorAll(".about-info-button");
      const aboutBtn = Array.from(buttons).find((b) => !b.classList.contains("settings-info-button")) as HTMLButtonElement;
      const publisher = document.querySelector(".titlebar-publisher") as HTMLElement;
      expect(themeBtn.getAttribute("aria-label")).toBeTruthy();
      expect(settingsBtn.getAttribute("aria-label")).toBeTruthy();
      expect(aboutBtn.getAttribute("aria-label")).toBeTruthy();
      expect(publisher.getAttribute("aria-label")).toBeTruthy();
    });

    it("opens the theme-toggle Tooltip on hover with the target-state copy", async () => {
      renderTitleBar();
      const themeBtn = document.querySelector("button.theme-toggle") as HTMLButtonElement;
      vi.useFakeTimers();
      await act(async () => {
        fireEvent.mouseEnter(themeBtn);
        vi.runAllTimers();
      });
      const describedBy = themeBtn.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      const tooltipBody = document.getElementById(describedBy!);
      expect(tooltipBody?.textContent).toBe("切换到明亮主题");
      vi.useRealTimers();
    });

    it("opens the publisher Tooltip with the tagline copy under en locale", async () => {
      try { window.localStorage.setItem("openme.lang", "en"); } catch {}
      renderTitleBar();
      const publisher = document.querySelector(".titlebar-publisher") as HTMLElement;
      vi.useFakeTimers();
      await act(async () => {
        fireEvent.mouseEnter(publisher);
        vi.runAllTimers();
      });
      const describedBy = publisher.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      const tooltipBody = document.getElementById(describedBy!);
      // 钢铁私塾旗下产品 · 工业软件 + AI 工具集
      expect(tooltipBody?.textContent ?? "").toMatch(/Gangtie Shuxu|钢铁私塾/);
      vi.useRealTimers();
    });
  });
