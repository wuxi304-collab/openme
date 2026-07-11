// @vitest-environment jsdom
// Contract tests for PR #132 -- StatusBar transient polish.
//   - Theme button aria-label reflects the *target* state
//   - Filename copy success announces via polite live region
//   - Filename copy failure fires an error toast AND announces
//   - Save-shortcut pill is aria-hidden (decorative duplication)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import StatusBar from "./components/layout/StatusBar";
import { I18nProvider, useI18n } from "./i18n";
import { SettingsProvider } from "./settings";
import { ToastProvider, type ToastKind } from "./components/useToast";

interface CapturedToast { kind: ToastKind; message: string }

function Harness({ activeTab, captured }: { activeTab: Parameters<typeof StatusBar>[0]["activeTab"]; captured?: CapturedToast[] }) {
  return (
    <I18nProvider>
      <SettingsProvider>
        <ToastProvider value={{ pushToast: (kind, message) => { captured?.push({ kind, message }); } }}>
          <StatusBar activeTab={activeTab} />
        </ToastProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  try {
    window.localStorage.removeItem("openme.lang");
    window.localStorage.removeItem("openme.settings.v1");
  } catch {}
});

beforeEach(() => {
  try {
    window.localStorage.removeItem("openme.lang");
    window.localStorage.removeItem("openme.settings.v1");
  } catch {}
});

describe("StatusBar transient polish (PR #132) -- theme aria-label flips with state", () => {
  it("advertises Switch to light while the current theme is dark (zh)", () => {
    render(<Harness activeTab={null} />);
    const btn = document.querySelector(".status-theme-pill") as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute("aria-label")).toBe("切换到浅色主题");
    expect(btn?.getAttribute("title")).toBe("切换到浅色主题");
  });

  it("advertises Switch to dark after clicking from light mode (en)", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    render(<Harness activeTab={null} />);
    const btn = document.querySelector(".status-theme-pill") as HTMLButtonElement | null;
    expect(btn?.getAttribute("aria-label")).toBe("Switch to light theme");
    fireEvent.click(btn!);
    expect(btn?.getAttribute("aria-label")).toBe("Switch to dark theme");
  });

  it("always keeps aria-pressed aligned with the current theme", () => {
    render(<Harness activeTab={null} />);
    const btn = document.querySelector(".status-theme-pill") as HTMLButtonElement | null;
    expect(btn?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(btn!);
    expect(btn?.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("StatusBar transient polish (PR #132) -- filename copy feedback", () => {
  it("on success, the polite live region announces the success copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<Harness activeTab={{ name: "hero.psd", path: String.raw`C:\demo\hero.psd` }} />);
    const btn = document.querySelector(".status-filename-button") as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
        await act(async () => {
          fireEvent.click(btn!);
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });
        const live = document.querySelector(".status-sr-announcer");
        expect(live).toBeTruthy();
        expect(live?.textContent ?? "").toMatch(/路径已复制|Path copied|已复制|Copied/);
        expect(writeText).toHaveBeenCalledWith(String.raw`C:\demo\hero.psd`);
      });

      it("on failure, fires an error toast AND announces the failure", async () => {
        const writeText = vi.fn().mockRejectedValue(new Error("denied"));
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText },
        });
        const captured: CapturedToast[] = [];
        render(
          <Harness
            activeTab={{ name: "hero.psd", path: String.raw`C:\demo\hero.psd` }}
            captured={captured}
          />
        );
        const btn = document.querySelector(".status-filename-button") as HTMLButtonElement | null;
        await act(async () => {
          fireEvent.click(btn!);
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });
        expect(captured.length).toBeGreaterThan(0);
        expect(captured[0].kind).toBe("error");
        expect(captured[0].message).toMatch(/复制失败|Copy failed/);
        const live = document.querySelector(".status-sr-announcer");
        expect(live?.textContent ?? "").toMatch(/复制失败|Copy failed/);
      });

  it("renders the live region with role=status and aria-live=polite", () => {
    render(<Harness activeTab={{ name: "a.txt", path: "/tmp/a.txt" }} />);
    const live = document.querySelector(".status-sr-announcer");
    expect(live).toBeTruthy();
    expect(live?.getAttribute("role")).toBe("status");
    expect(live?.getAttribute("aria-live")).toBe("polite");
  });
});

describe("StatusBar transient polish (PR #132) -- chrome noise discipline", () => {
  it("marks the save-shortcut pill aria-hidden (decorative duplication)", () => {
    render(<Harness activeTab={{ name: "draft.md", path: "/tmp/draft.md", isDirty: true }} />);
    const pills = Array.from(document.querySelectorAll(".status-pill"));
    const savePill = pills.find((el) => /Ctrl S|to save/.test(el.textContent ?? ""));
    expect(savePill).toBeTruthy();
    expect(savePill?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("StatusBar transient polish (PR #132) -- i18n parity", () => {
  it("both locales expose the new keys with non-empty strings", () => {
    let zhT: ((k: string) => string) | null = null;
    let enT: ((k: string) => string) | null = null;
    function ProbeZh() { zhT = useI18n().t; return null; }
    function ProbeEn() { enT = useI18n().t; return null; }
    render(
      <>
        <I18nProvider>
          <ProbeZh />
        </I18nProvider>
        <I18nProvider>
          <ProbeEn />
        </I18nProvider>
      </>
    );
    expect(zhT).toBeTruthy();
    expect(enT).toBeTruthy();
    const keys = [
      "statusFilenameCopyFailed",
      "statusThemeToggleToLight",
      "statusThemeToggleToDark",
      "statusCopyAnnounceSuccess",
      "statusCopyAnnounceFailure",
    ];
    for (const k of keys) {
      expect((zhT as unknown as (k: string) => string)(k)).not.toBe(k);
      expect((enT as unknown as (k: string) => string)(k)).not.toBe(k);
    }
  });
});
