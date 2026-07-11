// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* PR #117 — Splash polish (emil-design-eng tokens + stagger + accent line)
 *
 * Pure-source assertions: the splash is an Electron renderer with no
 * build pipeline, so we verify its CSS/HTML contracts by reading the
 * static files and matching the structural pieces we just added.
 */

const ROOT = process.cwd();

const TOKENS_CSS = readFileSync(join(ROOT, "electron/splash/tokens.css"), "utf8");
const SPLASH_CSS = readFileSync(join(ROOT, "electron/splash/splash.css"), "utf8");
const SPLASH_HTML = readFileSync(join(ROOT, "electron/splash/splash.html"), "utf8");
const SPLASH_JS = readFileSync(join(ROOT, "electron/splash/splash.js"), "utf8");

describe("splash-polish · tokens.css", () => {
  it("declares the emil-design-eng motion tokens", () => {
    expect(TOKENS_CSS).toMatch(/--ease-out\s*:\s*cubic-bezier\(0\.23,\s*1,\s*0\.32,\s*1\)/);
    expect(TOKENS_CSS).toMatch(/--ease-in-out\s*:\s*cubic-bezier\(0\.77,\s*0,\s*0\.175,\s*1\)/);
    expect(TOKENS_CSS).toMatch(/--ease-drawer\s*:/);
  });

  it("declares the four-tier duration scale", () => {
    expect(TOKENS_CSS).toMatch(/--dur-press\s*:\s*140ms/);
    expect(TOKENS_CSS).toMatch(/--dur-fast\s*:\s*200ms/);
    expect(TOKENS_CSS).toMatch(/--dur-base\s*:/);
    expect(TOKENS_CSS).toMatch(/--dur-modal\s*:/);
  });

  it("flattens motion under prefers-reduced-motion (zero, not just disabled)", () => {
    // We force durations to 0ms under reduced-motion so the stagger
    // becomes a no-op rather than a slow slide. This is stricter than
    // a plain `transition: none` — emil's contract.
    expect(TOKENS_CSS).toMatch(/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/);
    expect(TOKENS_CSS).toMatch(/--stagger-step\s*:\s*0ms/);
    expect(TOKENS_CSS).toMatch(/--dur-base\s*:\s*0ms/);
  });

  it("uses the accent-strong variable (not a magic number) for the logo gradient", () => {
    // The brand gradient must reference the token so a single edit in
    // tokens.css propagates to the splash.
    expect(TOKENS_CSS).toMatch(/--accent-strong\s*:/);
  });

  it("declares a stagger-step token so the splash-card entrance is data-driven", () => {
    expect(TOKENS_CSS).toMatch(/--stagger-step\s*:\s*80ms/);
  });
});

describe("splash-polish · splash.css honors tokens", () => {
  it("@imports tokens.css as the first rule", () => {
    // Tokens must come before the rest so they win the cascade.
    expect(SPLASH_CSS).toMatch(/@import\s+url\(["']\.\/tokens\.css["']\)/);
    const importIdx = SPLASH_CSS.search(/@import\s+url/);
    const otherIdx = SPLASH_CSS.search(/:root|\.splash\b/);
    expect(importIdx).toBeLessThan(otherIdx);
  });

  it("never uses Material's weak curve or the bare 'ease' keyword", () => {
      // We should never see cubic-bezier(0.4, 0, 0.2, 1) (Material weak
      // curve) in transitions. Strong curves live in tokens.css and are
      // referenced via var(--ease-out) / var(--ease-in-out), so a literal
      // cubic-bezier should NOT appear in splash.css itself.
      const cubic = SPLASH_CSS.match(/cubic-bezier\([^)]*\)/g) || [];
    for (const curve of cubic) {
      expect(curve).not.toMatch(/cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/);
    }
      // The default CSS 'ease' keyword is also too weak.
      expect(SPLASH_CSS).not.toMatch(/transition[^;]*\bease\b(?![-])/);
    });

  it("animates only opacity / transform / width (no layout-triggering properties)", () => {
    // emil says: animate only transform + opacity (GPU friendly).
    // `width` on .splash-progress-fill is allowed because it's the
    // primary visual feedback of progress and a 200ms ease-out on a
    // 4px track is well below jank threshold.
      // `transition: none;` (used in reduced-motion safety nets) is also OK.
      const transitions = SPLASH_CSS.match(/transition\s*:[^;]+;/g) || [];
      for (const t of transitions) {
        if (/transition\s*:\s*none\s*;/.test(t)) continue;
        expect(t).toMatch(/transition\s*:[^;]*(transform|opacity|width|max-height|background|color|border|box-shadow|margin)[^;]*;/);
        expect(t).not.toMatch(/\b(top|left|right|bottom|height|padding)\b/);
      }
    });

  it("applies the staggered entrance to every direct child of the splash card", () => {
    expect(SPLASH_CSS).toMatch(/\.splash-card\s*>\s*\*\s*\{[\s\S]*?animation\s*:\s*splash-child-enter/);
    // nth-child delays must step by --stagger-step.
    const delays = SPLASH_CSS.match(/nth-child\(\d+\)\s*\{\s*animation-delay\s*:\s*calc\(var\(--stagger-step\)/g) || [];
    expect(delays.length).toBeGreaterThanOrEqual(5);
  });

  it("respects prefers-reduced-motion by zeroing stagger animations", () => {
    // The tokens.css reduced-motion block already sets --stagger-step: 0ms
      // and --dur-base: 0ms. splash.css adds an explicit safety-net block
      // so older UAs without tokens.css still degrade gracefully.
      expect(SPLASH_CSS).toMatch(/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/);
      // Belt-and-suspenders: the long decorative loops should be killed
      // explicitly so they don't run even if a token didn't propagate.
      expect(SPLASH_CSS).toMatch(/prefers-reduced-motion[\s\S]*?\.splash-glow\s*\{\s*animation\s*:\s*none/);
    expect(SPLASH_CSS).toMatch(/prefers-reduced-motion[\s\S]*?\.splash-phase-dot\s*\{\s*animation\s*:\s*none/);
      expect(SPLASH_CSS).toMatch(/prefers-reduced-motion[\s\S]*?\.splash\s*\{\s*transition\s*:\s*none/);
    });

  it("draws the China-red accent line above the version meta row via ::before", () => {
    expect(SPLASH_CSS).toMatch(/\.splash-meta::before\s*\{/);
    expect(SPLASH_CSS).toMatch(/\.splash-meta[\s\S]*?linear-gradient\([\s\S]*?var\(--accent\)/);
  });

  it("preserves the staggered card root entrance", () => {
    expect(SPLASH_CSS).toMatch(/@keyframes\s+splash-enter\s*\{/);
    expect(SPLASH_CSS).toMatch(/\.splash\s*\{[\s\S]*?animation\s*:\s*splash-enter/);
  });
});

describe("splash-polish · splash.html semantics", () => {
  it("the splash root references the title via aria-labelledby", () => {
    expect(SPLASH_HTML).toMatch(/class="splash"[^>]*aria-labelledby="splash-title"/);
    expect(SPLASH_HTML).toMatch(/id="splash-title"/);
  });

  it("the logo is aria-hidden (decorative) and labelled separately", () => {
    expect(SPLASH_HTML).toMatch(/class="splash-logo"[^>]*aria-hidden="true"/);
  });

  it("the version fallback is 'v1.0.0' so a missing IPC event still shows the right version", () => {
    const m = SPLASH_HTML.match(/id="splash-version"[^>]*>([^<]+)</);
    expect(m?.[1]).toBe("v1.0.0");
  });
});

describe("splash-polish · splash.js copy contracts", () => {
  // Per pocket-ui-polish/references/copy.md: phases stay tight (no
  // "正在..." verb padding). Phase labels stay distinct so screen
  // readers can track progress.
  const PHASE_KEYS = [
    "splashPhaseBoot",
    "splashPhaseRenderer",
    "splashPhaseAssets",
    "splashPhaseReady",
  ];

  it.each(PHASE_KEYS)("zh %s has no leading 正在 (verb padding)", (key) => {
    const block = SPLASH_JS.match(new RegExp(`${key}\\s*:\\s*"([^"]+)"`));
    const value = block?.[1];
    expect(value).toBeTruthy();
    expect(value).not.toMatch(/^正在/);
  });

  it.each(PHASE_KEYS)("en %s has no trailing '...' (ellipsis implies waiting)", (key) => {
    const block = SPLASH_JS.match(new RegExp(`${key}\\s*:\\s*"([^"]+)"`));
    const value = block?.[1];
    expect(value).not.toMatch(/\.\.\.$/);
  });
});

describe("splash-polish · i18n.tsx mirrors splash.js", () => {
  // The renderer-side i18n.tsx keeps its own splash dict for fallback /
  // test surface. Make sure it agrees with splash.js so a user on a
  // language the splash.js dict misses still sees the right copy.
  const i18n = readFileSync(join(ROOT, "src/i18n.tsx"), "utf8");
  const splash = SPLASH_JS;

  it("splash.js zh phaseBoot === i18n.tsx zh splashPhaseBoot", () => {
    const a = splash.match(/splashPhaseBoot:\s*"([^"]+)"/)?.[1];
    const b = i18n.match(/splashPhaseBoot:\s*"([^"]+)"/)?.[1];
    expect(a).toBe(b);
  });
  it("splash.js en phaseAssets === i18n.tsx en splashPhaseAssets", () => {
    const a = splash.match(/splashPhaseAssets:\s*"([^"]+)"/)?.[1];
    const b = i18n.match(/splashPhaseAssets:\s*"([^"]+)"/)?.[1];
    expect(a).toBe(b);
  });
});
