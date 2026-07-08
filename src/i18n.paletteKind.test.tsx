// @vitest-environment jsdom
// Tests for the new paletteKind* keys added in PR #46.
//
// These keys localize the kind tag that appears next to each command
// in the command palette (File / Tab / Workspace / System / Recent /
// Command). Before this fix, the tag was rendered as the literal
// English string "command" when no kind was set — visible to zh
// users as a language leak.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { I18nProvider, useI18n, translations } from "./i18n";

beforeEach(() => {
  // Provider reads openme.lang from localStorage on mount; clear it so
  // each test starts on the deterministic default (zh).
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

function KindProbe({ kind }: { kind: "file" | "tab" | "workspace" | "system" | "recent" | undefined }) {
  const { t } = useI18n();
  const key =
    kind === "file" ? "paletteKindFile"
    : kind === "tab" ? "paletteKindTab"
    : kind === "workspace" ? "paletteKindWorkspace"
    : kind === "system" ? "paletteKindSystem"
    : kind === "recent" ? "paletteKindRecent"
    : "paletteKindCommand";
  return <span data-testid="kind">{t(key)}</span>;
}

function ProbeWithSwitch({ kind }: { kind: "file" | "tab" | "workspace" | "system" | "recent" | undefined }) {
  // Test fixture: wraps the KindProbe with buttons that flip the language.
  // This mirrors how the real CommandPalette integrates with the lang
  // switcher in the title bar.
  const { setLang } = useI18n();
  return (
    <div>
      <button type="button" data-testid="set-en" onClick={() => setLang("en")}>EN</button>
      <button type="button" data-testid="set-zh" onClick={() => setLang("zh")}>ZH</button>
      <KindProbe kind={kind} />
    </div>
  );
}

function renderProbe(lang: "zh" | "en", kind: "file" | "tab" | "workspace" | "system" | "recent" | undefined) {
  const utils = render(
    <I18nProvider>
      <ProbeWithSwitch kind={kind} />
    </I18nProvider>
  );
  // Provider defaults to zh; flip if needed.
  if (lang === "en") {
    act(() => { screen.getByTestId("set-en").click(); });
  }
  return utils;
}

describe("paletteKind* keys", () => {
  it("translations.zh has all six kind keys", () => {
    expect(translations.zh.paletteKindFile).toBeTruthy();
    expect(translations.zh.paletteKindTab).toBeTruthy();
    expect(translations.zh.paletteKindWorkspace).toBeTruthy();
    expect(translations.zh.paletteKindSystem).toBeTruthy();
    expect(translations.zh.paletteKindRecent).toBeTruthy();
    expect(translations.zh.paletteKindCommand).toBeTruthy();
  });

  it("translations.en has all six kind keys", () => {
    expect(translations.en.paletteKindFile).toBeTruthy();
    expect(translations.en.paletteKindTab).toBeTruthy();
    expect(translations.en.paletteKindWorkspace).toBeTruthy();
    expect(translations.en.paletteKindSystem).toBeTruthy();
    expect(translations.en.paletteKindRecent).toBeTruthy();
    expect(translations.en.paletteKindCommand).toBeTruthy();
  });

  // The "command" fallback in particular is the regression we want to
  // catch — the previous hardcoded string was the only English leak
  // in the zh command palette.
  it("zh.paletteKindCommand is Chinese, not the literal 'command'", () => {
    expect(translations.zh.paletteKindCommand).not.toBe("command");
    expect(translations.zh.paletteKindCommand).toMatch(/[\u4E00-\u9FFF]/);
  });

  // Render-level checks: each kind should round-trip through the
  // provider correctly in both languages.
  it.each([
    ["file", "zh", "文件"], ["file", "en", "File"],
    ["tab", "zh", "标签页"], ["tab", "en", "Tab"],
    ["workspace", "zh", "工作台"], ["workspace", "en", "Workspace"],
    ["system", "zh", "系统"], ["system", "en", "System"],
    ["recent", "zh", "最近"], ["recent", "en", "Recent"],
    [undefined, "zh", "命令"], [undefined, "en", "Command"],
  ] as const)("renders %s in %s as %s", (kind, lang, expected) => {
    renderProbe(lang, kind);
    expect(screen.getByTestId("kind").textContent).toBe(expected);
  });
});
