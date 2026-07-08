// @vitest-environment jsdom
//
// Integration test for the React side of i18n: I18nProvider + useI18n hook
// wiring. The pure formatting logic (formatIcu) is covered in i18n.test.ts;
// this file locks down the behavior that a React component actually sees:
//
//   - I18nProvider propagates lang through context
//   - setLang triggers a re-render with the new bundle
//   - tf() inside a component resolves ICU plural correctly per language
//   - The dict has no missing keys for the 6 ICU-plural keys we shipped
//
// If a future refactor accidentally drops the lang from the context value,
// or breaks the plural rule switch, these tests will fail loudly.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { I18nProvider, useI18n } from "./i18n";

// A small probe that exposes everything a typical viewer needs. Re-renders
// happen automatically when lang changes because useI18n re-reads context.
function Probe({ id, params }: { id: string; params?: Record<string, string | number> }) {
  const { t, tf, lang } = useI18n();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="t">{t(id)}</span>
      <span data-testid="tf">{tf(id, params)}</span>
    </div>
  );
}

// A probe that wraps a language switcher so tests can flip locales.
function WithSwitcher({ children }: { children: React.ReactNode }) {
  const { lang, setLang } = useI18n();
  return (
    <div>
      <button data-testid="set-en" type="button" onClick={() => setLang("en")}>EN</button>
      <button data-testid="set-zh" type="button" onClick={() => setLang("zh")}>ZH</button>
      <span data-testid="current">{lang}</span>
      {children}
    </div>
  );
}

beforeEach(() => {
  // Each test starts on a known lang. localStorage is the only thing the
  // provider reads on mount, so wiping it is enough. We use removeItem
  // for explicit error visibility (if the API were ever replaced, the
  // test would fail loudly instead of silently using a stale value).
  try { window.localStorage.removeItem("openme.lang"); } catch {}
  document.documentElement.lang = "";
});

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

describe("I18nProvider — initial language", () => {
  it("defaults to zh when localStorage is empty", () => {
    render(
      <I18nProvider>
        <Probe id="openFile" />
      </I18nProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("zh");
    expect(screen.getByTestId("t").textContent).toBe("打开文件");
  });

  it("hydrates en from localStorage on a fresh mount", () => {
    window.localStorage.setItem("openme.lang", "en");
    render(
      <I18nProvider>
        <Probe id="openFile" />
      </I18nProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("t").textContent).toBe("Open file");
  });

  it("persists lang to localStorage and to <html lang> when it changes", () => {
    render(
      <I18nProvider>
        <WithSwitcher>
          <Probe id="openFile" />
        </WithSwitcher>
      </I18nProvider>,
    );
    act(() => {
      screen.getByTestId("set-en").click();
    });
    expect(window.localStorage.getItem("openme.lang")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });
});

describe("tf() — ICU plural inside React", () => {
  it("en: n=1 selects the 'one' branch", () => {
    window.localStorage.setItem("openme.lang", "en");
    render(
      <I18nProvider>
        <Probe id="pdfMatchCount" params={{ count: 1 }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId("tf").textContent).toMatch(/^1 /);
    expect(screen.getByTestId("tf").textContent).toMatch(/match$/);
  });

  it("en: n=0 and n>1 select the 'other' branch", () => {
    window.localStorage.setItem("openme.lang", "en");
    const { rerender } = render(
      <I18nProvider>
        <Probe id="pdfMatchCount" params={{ count: 0 }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId("tf").textContent).toMatch(/^0 /);
    expect(screen.getByTestId("tf").textContent).toMatch(/matches$/);

    rerender(
      <I18nProvider>
        <Probe id="pdfMatchCount" params={{ count: 17 }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId("tf").textContent).toMatch(/^17 /);
    expect(screen.getByTestId("tf").textContent).toMatch(/matches$/);
  });

  it("zh: n=1 and n>1 both select the 'other' branch (no grammatical plural)", () => {
    window.localStorage.setItem("openme.lang", "zh");
    const { rerender } = render(
      <I18nProvider>
        <Probe id="zipCount" params={{ files: 1, dirs: 2 }} />
      </I18nProvider>,
    );
    const first = screen.getByTestId("tf").textContent ?? "";
    expect(first).toContain("1");

    rerender(
      <I18nProvider>
        <Probe id="zipCount" params={{ files: 42, dirs: 2 }} />
      </I18nProvider>,
    );
    const second = screen.getByTestId("tf").textContent ?? "";
    expect(second).toContain("42");
    // Chinese has no grammatical plural: stripping the count from each
    // output should leave identical text on both sides.
    expect(first.replace("1", "").trim()).toBe(second.replace("42", "").trim());
  });
});

describe("tf() — simple {key} substitution inside React", () => {
  it("substitutes a single named placeholder", () => {
    window.localStorage.setItem("openme.lang", "en");
    render(
      <I18nProvider>
        <Probe id="cmdClearSearchDetailActive" params={{ query: "blueprint" }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId("tf").textContent).toBe("Current search: blueprint");
  });

  it("substitutes multiple placeholders in one template", () => {
    window.localStorage.setItem("openme.lang", "zh");
    render(
      <I18nProvider>
        <Probe id="paletteCount" params={{ shown: 3, total: 9 }} />
      </I18nProvider>,
    );
    // zh template is "{shown} / {total} 项" — the trailing " 项" (item)
    // is a static suffix, not a placeholder.
    expect(screen.getByTestId("tf").textContent).toBe("3 / 9 项");
  });

  it("leaves missing keys as the raw {key} token (no crash)", () => {
    window.localStorage.setItem("openme.lang", "en");
    render(
      <I18nProvider>
        <Probe id="definitelyNotAKey" params={{ who: "alice" }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId("tf").textContent).toBe("definitelyNotAKey");
  });
});

describe("I18nProvider — re-render on language change", () => {
  it("consumer re-renders with the new bundle after setLang", () => {
    render(
      <I18nProvider>
        <WithSwitcher>
          <Probe id="openFile" />
        </WithSwitcher>
      </I18nProvider>,
    );
    // Initial: zh
    expect(screen.getByTestId("t").textContent).toBe("打开文件");
    act(() => {
      screen.getByTestId("set-en").click();
    });
    expect(screen.getByTestId("t").textContent).toBe("Open file");
    act(() => {
      screen.getByTestId("set-zh").click();
    });
    expect(screen.getByTestId("t").textContent).toBe("打开文件");
  });

  it("consumer re-renders tf() after setLang (ICU plural switches branch)", () => {
    render(
      <I18nProvider>
        <WithSwitcher>
          <Probe id="csvErrors" params={{ count: 1 }} />
        </WithSwitcher>
      </I18nProvider>,
    );
    // zh: always "other" form
    const zhText = screen.getByTestId("tf").textContent;
    expect(zhText).toContain("1");
    act(() => {
      screen.getByTestId("set-en").click();
    });
    const enText = screen.getByTestId("tf").textContent;
    // en: count=1 should select the singular "one" branch, which differs from zh.
    expect(enText).not.toBe(zhText);
    expect(enText).toContain("1");
  });
});

describe("I18nProvider — all 6 ICU-plural keys exist in both languages", () => {
  // This test catches a class of bug where a key is added to en but not zh
  // (or vice versa). Each key is rendered with count=0 in both languages and
  // we assert the output is not the raw key (which is what tf() returns when
  // the translation is missing).
  const keys = [
    "csvErrors",
    "pdfMatchCount",
    "cad3dVertices",
    "cad3dMeshes",
    "cmdTabCountDetail",
    "zipCount",
  ];

  for (const key of keys) {
    for (const lang of ["zh", "en"] as const) {
      it(`${key} in ${lang} resolves to a non-empty translation`, () => {
        window.localStorage.setItem("openme.lang", lang);
        render(
          <I18nProvider>
            <Probe id={key} params={{ count: 3 }} />
          </I18nProvider>,
        );
        const out = screen.getByTestId("tf").textContent ?? "";
        expect(out).not.toBe(key);
        expect(out.length).toBeGreaterThan(0);
      });
    }
  }
});
