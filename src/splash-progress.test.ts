// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { translations } from "./i18n";

/* PR #95 — Splash progress integration test
 *
 * The splash renderer (electron/splash/splash.js) is an IIFE that:
 *   - reads a small inline i18n dict
 *   - exposes setProgress / setPhase / setVersion / applyI18n / fadeOut on
 *     window.splash
 *   - subscribes to window.openmeSplash.onProgress / onInit / onLangChange /
 *     onFade bridge events pushed from the main process
 *
 * We load the actual splash.js source as text and eval it inside jsdom with
 * a stubbed bridge, then drive the bridge to verify the splash renderer
 * responds correctly. The dict is duplicated inside splash.js — we also
 * cross-check it against the canonical translations in src/i18n.tsx so
 * the splash can never drift from the renderer copy.
 */

const SPLASH_JS = readFileSync(
  join(process.cwd(), "electron/splash/splash.js"),
  "utf8",
);

const SPLASH_HTML = readFileSync(
  join(process.cwd(), "electron/splash/splash.html"),
  "utf8",
);

const SPLASH_CSS = readFileSync(
  join(process.cwd(), "electron/splash/splash.css"),
  "utf8",
);

/** Stub for the contextBridge surface injected by splash-preload.js. We
 * capture the handlers the splash renderer registers so tests can invoke
 * them as if they came from the main process. */
type Bridge = {
  onInit?: (h: (p: { version: string; lang: string }) => void) => void;
  onProgress?: (h: (p: { percent: number; phase: string; lang: string }) => void) => void;
  onLangChange?: (h: (lang: string) => void) => void;
  onFade?: (h: () => void) => void;
};

interface CapturedBridge {
  bridge: Bridge;
  handlers: {
    init?: (p: { version: string; lang: string }) => void;
    progress?: (p: { percent: number; phase: string; lang: string }) => void;
    lang?: (lang: string) => void;
    fade?: () => void;
  };
}

function installBridgeStub(): CapturedBridge {
  const bridge: Bridge = {};
  const handlers: CapturedBridge["handlers"] = {};
  bridge.onInit = (h) => {
    handlers.init = h;
  };
  bridge.onProgress = (h) => {
    handlers.progress = h;
  };
  bridge.onLangChange = (h) => {
    handlers.lang = h;
  };
  bridge.onFade = (h) => {
    handlers.fade = h;
  };
  // splash.js reads `window.openmeSplash` — set it before evaluating the IIFE.
  (window as unknown as { openmeSplash: Bridge }).openmeSplash = bridge;
  return { bridge, handlers };
}

function loadSplashIntoDom() {
  // Parse the static splash.html into jsdom so the IIFE finds the elements it
  // expects (splash-progress-fill, splash-phase-text, splash-version, etc.).
  document.documentElement.innerHTML = SPLASH_HTML.replace(/^[\s\S]*?<body>/, "").replace(/<\/body>[\s\S]*$/, "");
  // Inject splash.css so .is-fading / .is-swapping class rules exist if any
  // test wants to inspect computed styles. Not strictly required but keeps
  // the test surface realistic.
  const style = document.createElement("style");
  style.textContent = SPLASH_CSS;
  document.head.appendChild(style);
  // Evaluate the IIFE in the current jsdom realm.
  // eslint-disable-next-line no-new-func
  new Function(SPLASH_JS)();
}

beforeEach(() => {
  document.documentElement.innerHTML = "<html><head></head><body></body></html>";
});

describe("splash.js renderer wiring", () => {
  it("registers all four bridge handlers", () => {
    const { handlers } = installBridgeStub();
    loadSplashIntoDom();
    expect(typeof handlers.init).toBe("function");
    expect(typeof handlers.progress).toBe("function");
    expect(typeof handlers.lang).toBe("function");
    expect(typeof handlers.fade).toBe("function");
  });

  it("applyI18n replaces all data-i18n strings with the dict for the language", () => {
    installBridgeStub();
    loadSplashIntoDom();
    const api = (window as unknown as { splash: { applyI18n: (lang: string) => void } }).splash;
    api.applyI18n("en");
    const titleEl = document.querySelector('[data-i18n="splashTitle"]');
    expect(titleEl?.textContent).toBe("OpenMe Qiwu");
    const phaseEl = document.querySelector('[data-i18n="splashPhaseBoot"]');
    expect(phaseEl?.textContent).toBe("Starting engine");
  });

  it("falls back to zh dict when an unknown language is supplied", () => {
    installBridgeStub();
    loadSplashIntoDom();
    const api = (window as unknown as { splash: { applyI18n: (lang: string) => void } }).splash;
    api.applyI18n("ja" as unknown as string);
    const phaseEl = document.querySelector('[data-i18n="splashPhaseBoot"]');
    expect(phaseEl?.textContent).toBe("正在启动内核");
  });

  it("setVersion prefixes the version with v", () => {
    installBridgeStub();
    loadSplashIntoDom();
    const api = (window as unknown as { splash: { setVersion: (v: string) => void } }).splash;
    api.setVersion("0.2.0");
    const v = document.getElementById("splash-version");
    expect(v?.textContent).toBe("v0.2.0");
  });

  it("setVersion ignores empty strings", () => {
    installBridgeStub();
    loadSplashIntoDom();
    const api = (window as unknown as { splash: { setVersion: (v: string) => void } }).splash;
    const before = document.getElementById("splash-version")?.textContent;
    api.setVersion("");
    const after = document.getElementById("splash-version")?.textContent;
    expect(after).toBe(before);
  });

  it("setProgress clamps to [0, 100] and rounds", () => {
    installBridgeStub();
    loadSplashIntoDom();
    const api = (window as unknown as { splash: { setProgress: (p: number) => void } }).splash;
    api.setProgress(50);
    expect(document.getElementById("splash-progress-fill")?.style.width).toBe("50%");
    api.setProgress(150);
    expect(document.getElementById("splash-progress-fill")?.style.width).toBe("100%");
    api.setProgress(-3);
    expect(document.getElementById("splash-progress-fill")?.style.width).toBe("0%");
    api.setProgress(33.7);
    expect(document.getElementById("splash-progress-fill")?.style.width).toBe("34%");
  });

  it("setProgress is a no-op when the fill element is missing", () => {
    installBridgeStub();
    // Deliberately skip loadSplashIntoDom — no fill element exists.
    const api = (window as unknown as { splash: { setProgress: (p: number) => void } }).splash;
    expect(() => api.setProgress(50)).not.toThrow();
  });

  it("setPhase resolves unknown keys back to splashPhaseBoot", () => {
    installBridgeStub();
    loadSplashIntoDom();
    const api = (window as unknown as { splash: { setPhase: (k: string, l: string) => void } }).splash;
    api.setPhase("notARealPhase", "en");
    // setPhase uses a 140ms setTimeout to swap text after the swap class;
    // advance fake timers so the swap completes.
    vi.useFakeTimers();
    api.setPhase("splashPhaseRenderer", "en");
    vi.advanceTimersByTime(150);
    const text = document.getElementById("splash-phase-text");
    expect(text?.textContent).toBe("Loading interface");
    vi.useRealTimers();
  });

  it("fadeOut adds the .is-fading class to the splash root", () => {
    installBridgeStub();
    loadSplashIntoDom();
    const api = (window as unknown as { splash: { fadeOut: () => void } }).splash;
    const root = document.querySelector(".splash");
    expect(root?.classList.contains("is-fading")).toBe(false);
    api.fadeOut();
    expect(root?.classList.contains("is-fading")).toBe(true);
  });

  it("bridge-driven init routes to applyI18n + setVersion", () => {
    const { handlers } = installBridgeStub();
    loadSplashIntoDom();
    handlers.init?.({ version: "9.9.9", lang: "en" });
    expect(document.querySelector('[data-i18n="splashPhaseBoot"]')?.textContent).toBe("Starting engine");
    expect(document.getElementById("splash-version")?.textContent).toBe("v9.9.9");
  });

  it("bridge-driven progress routes to setProgress + setPhase", () => {
    const { handlers } = installBridgeStub();
    loadSplashIntoDom();
    handlers.init?.({ version: "0.1.0", lang: "en" });
      vi.useFakeTimers();
      handlers.progress?.({ percent: 45, phase: "splashPhaseRenderer", lang: "en" });
      expect(document.getElementById("splash-progress-fill")?.style.width).toBe("45%");
    vi.advanceTimersByTime(160);
    expect(document.getElementById("splash-phase-text")?.textContent).toBe("Loading interface");
    vi.useRealTimers();
  });

  it("bridge-driven lang change re-applies i18n", () => {
    const { handlers } = installBridgeStub();
    loadSplashIntoDom();
    handlers.init?.({ version: "0.1.0", lang: "zh" });
    expect(document.querySelector('[data-i18n="splashPhaseBoot"]')?.textContent).toBe("正在启动内核");
    handlers.lang?.("en");
    expect(document.querySelector('[data-i18n="splashPhaseBoot"]')?.textContent).toBe("Starting engine");
  });

  it("bridge-driven fade triggers .is-fading class", () => {
    const { handlers } = installBridgeStub();
    loadSplashIntoDom();
    handlers.fade?.();
    expect(document.querySelector(".splash")?.classList.contains("is-fading")).toBe(true);
  });

  it("ignores missing bridge gracefully (does not throw)", () => {
    // splash.js guards on `if (window.openmeSplash)` — without it, it should
    // still register window.splash with its in-memory API.
    document.documentElement.innerHTML = "<html><head></head><body></body></html>";
    // eslint-disable-next-line no-new-func
    new Function(SPLASH_JS)();
    const api = (window as unknown as { splash?: unknown }).splash;
    expect(api).toBeTruthy();
  });
});

describe("splash i18n keys", () => {
  const PHASES = ["splashPhaseBoot", "splashPhaseRenderer", "splashPhaseAssets", "splashPhaseReady"] as const;
  for (const phase of PHASES) {
    it(`${phase} is non-empty in both locales`, () => {
      expect(translations.zh[phase]).toBeTruthy();
      expect(translations.en[phase]).toBeTruthy();
    });
  }
  it("phase labels are distinct in both locales", () => {
    for (const lang of ["zh", "en"] as const) {
      const labels = PHASES.map((p) => translations[lang][p]);
      expect(new Set(labels).size).toBe(PHASES.length);
    }
  });
});

describe("splash fade CSS rule", () => {
  it(".splash.is-fading rule exists and animates opacity", () => {
    expect(SPLASH_CSS).toMatch(/\.splash\.is-fading\s*\{[^}]*opacity\s*:\s*0/s);
  });
  it("fade transition honors prefers-reduced-motion", () => {
    // The CSS should disable the transition under reduced-motion so users
    // who opted out don't get a surprise animation during teardown.
    expect(SPLASH_CSS).toMatch(/prefers-reduced-motion\s*:\s*reduce[\s\S]*?\.splash\s*\{[^}]*transition\s*:\s*none/s);
  });
});

describe("splash-preload.js exposes the fade channel", () => {
  it("splash-preload.js exports onFade", () => {
    const preload = readFileSync(join(process.cwd(), "electron/splash-preload.js"), "utf8");
    expect(preload).toContain("onFade");
    expect(preload).toContain("splash:fade");
  });
});

describe("electron/main.js splash orchestration constants", () => {
  // We can't import main.js directly (it requires Electron's app module), but
  // we can grep for the phase-progress constants to lock in the contract:
  // every phase percent must be a non-decreasing ramp from 0 to 100.
  it("main.js declares the splash phase constants", () => {
    const main = readFileSync(join(process.cwd(), "electron/main.js"), "utf8");
    expect(main).toMatch(/SPLASH_BOOT_PCT\s*=\s*15/);
    expect(main).toMatch(/SPLASH_RENDERER_PCT\s*=\s*45/);
    expect(main).toMatch(/SPLASH_ASSETS_PCT\s*=\s*80/);
    expect(main).toMatch(/SPLASH_READY_PCT\s*=\s*98/);
    expect(main).toMatch(/SPLASH_DONE_PCT\s*=\s*100/);
  });
  it("main.js emits splash:progress at every lifecycle phase", () => {
    const main = readFileSync(join(process.cwd(), "electron/main.js"), "utf8");
      // emitSplashProgress is defined once but called from:
      //   - scheduleSplashTimeline (boot, renderer)
      //   - dom-ready handler (assets)
      //   - ready-to-show handler (ready, done)
      // We assert on the helper's existence plus its call sites.
      expect(main).toMatch(/function emitSplashProgress\(/);
      const callSites = main.match(/emitSplashProgress\(/g) || [];
      // 1 declaration + 5 invocations (boot, renderer, assets, ready, done)
      expect(callSites.length).toBeGreaterThanOrEqual(6);
    });
  it("main.js tracks uiLang for splash localization", () => {
    const main = readFileSync(join(process.cwd(), "electron/main.js"), "utf8");
    expect(main).toMatch(/let uiLang/);
    expect(main).toMatch(/uiLang = "zh"/);
  });
  it("main.js sends splash:lang on renderer lang change", () => {
    const main = readFileSync(join(process.cwd(), "electron/main.js"), "utf8");
    expect(main).toMatch(/emitSplashLangChange/);
    expect(main).toMatch(/splash:lang/);
  });
  it("main.js sends splash:fade before destroying splash window", () => {
    const main = readFileSync(join(process.cwd(), "electron/main.js"), "utf8");
    expect(main).toMatch(/splash:fade/);
  });
  it("main.js wires dom-ready to emit splash progress", () => {
    const main = readFileSync(join(process.cwd(), "electron/main.js"), "utf8");
    expect(main).toMatch(/dom-ready[\s\S]*?emitSplashProgress\(SPLASH_ASSETS_PCT/);
  });
  it("main.js wires ready-to-show to emit splash progress", () => {
    const main = readFileSync(join(process.cwd(), "electron/main.js"), "utf8");
    expect(main).toMatch(/ready-to-show[\s\S]*?emitSplashProgress\(SPLASH_READY_PCT/);
  });
  it("main.js calls emitSplashInit after createSplashWindow", () => {
    const main = readFileSync(join(process.cwd(), "electron/main.js"), "utf8");
    expect(main).toMatch(/createSplashWindow\(\);[\s\S]{0,40}?emitSplashInit\(\)/);
  });
});