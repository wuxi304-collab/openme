/* OpenMe splash renderer.
 *
 * Listens for `splash:progress` events from main process and updates:
 *   - progress bar fill (0..100)
 *   - phase dot animation trigger (CSS keyframes; we just toggle a class
 *     to re-arm it)
 *   - phase text label (i18n key resolved against the splash dict)
 *   - "swapping" fade for a smooth transition
 *
 * The dict is intentionally small and duplicated here rather than loading
 * the full renderer i18n bundle — the splash must render before any
 * user-side script runs.
 */
(function () {
  "use strict";

  const dict = {
    zh: {
      splashTitle: "OpenMe Qiwu",
      splashTagline: "万能文件打开器 · 钢铁私塾出品",
      splashPhaseBoot: "正在启动内核",
      splashPhaseRenderer: "正在加载界面",
      splashPhaseAssets: "正在准备文件支持矩阵",
      splashPhaseReady: "即将开始",
      splashHint: "首次启动需要几秒钟，请稍候",
      aboutPublisherName: "钢铁私塾",
    },
    en: {
      splashTitle: "OpenMe Qiwu",
      splashTagline: "Universal file opener · by Gangtie Shuxu",
      splashPhaseBoot: "Starting engine",
      splashPhaseRenderer: "Loading interface",
      splashPhaseAssets: "Preparing file support matrix",
      splashPhaseReady: "Almost ready",
      splashHint: "First launch takes a few seconds, please hold on",
      aboutPublisherName: "Gangtie Shuxu",
    },
  };

  function resolveLang(raw) {
    if (typeof raw === "string" && (raw === "en" || raw === "zh")) return raw;
    return "zh";
  }

  function applyI18n(lang) {
    const table = dict[lang] || dict.zh;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = table[key];
      if (typeof val === "string") el.textContent = val;
    });
  }

  function setVersion(version) {
    const el = document.getElementById("splash-version");
    if (el && typeof version === "string" && version.length > 0) {
      el.textContent = `v${version}`;
    }
  }

  function setProgress(pct) {
    const fill = document.getElementById("splash-progress-fill");
    if (!fill) return;
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    fill.style.width = clamped + "%";
  }

  function setPhase(key, lang) {
    const text = document.getElementById("splash-phase-text");
    const dot = document.getElementById("splash-phase-dot");
    if (!text || !dot) return;
    const table = dict[lang] || dict.zh;
    const label = table[key] || table.splashPhaseBoot;
    text.classList.add("is-swapping");
    window.setTimeout(() => {
      text.textContent = label;
      text.classList.remove("is-swapping");
    }, 140);
    // Re-arm the dot pulse by toggling the animation
    dot.style.animation = "none";
    /* eslint-disable-next-line no-unused-expressions */
    dot.offsetHeight;
    dot.style.animation = "";
  }

  /* Public API exposed to main via preload contextBridge. */
  const api = {
    setProgress,
    setPhase,
    setVersion,
    applyI18n,
  };

  window.splash = api;

  // Receive events from main process via the contextBridge surface
  if (window.openmeSplash) {
    const bridge = window.openmeSplash;
    if (typeof bridge.onProgress === "function") {
      bridge.onProgress(({ percent, phase, lang }) => {
        if (typeof percent === "number") setProgress(percent);
        if (typeof phase === "string" && typeof lang === "string") setPhase(phase, lang);
      });
    }
    if (typeof bridge.onInit === "function") {
      bridge.onInit(({ lang, version }) => {
        applyI18n(resolveLang(lang));
        setVersion(version);
      });
    }
    if (typeof bridge.onLangChange === "function") {
      bridge.onLangChange((lang) => applyI18n(resolveLang(lang)));
    }
  }
})();