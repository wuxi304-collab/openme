/* OpenMe splash renderer.
 *
 * Listens for splash progress / sublabel / metric / fade events from the
 * main process and updates the progress bar, phase text, sublabel,
 * elapsed time, and triggers a smooth fade-out.
 */
(function () {
  "use strict";

  const dict = {
    zh: {
      splashTitle: "OpenMe Qiwu",
      splashTagline: "万能文件打开器 · 钢铁私塾出品",
      splashPhaseBoot: "启动中",
      splashPhaseRenderer: "加载界面",
      splashPhaseAssets: "准备文件支持矩阵",
      splashPhaseReady: "准备就绪",
      splashHint: "首次启动需要几秒钟，请稍候",
      aboutPublisherName: "钢铁私塾",
    },
    en: {
      splashTitle: "OpenMe Qiwu",
      splashTagline: "Universal file opener · by Gangtie Shuxu",
      splashPhaseBoot: "Starting engine",
      splashPhaseRenderer: "Loading interface",
      splashPhaseAssets: "Building support matrix",
      splashPhaseReady: "Almost ready",
      splashHint: "First launch takes a few seconds, please hold on",
      aboutPublisherName: "Gangtie Shuxu",
    },
  };

    function resolveLang(raw) {
      if (raw === "en" || raw === "zh") return raw;
      return "zh";
    }

    function applyI18n(lang) {
      const table = dict[lang] || dict.zh;
      document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        const key = el.getAttribute("data-i18n");
        const val = table[key];
        if (typeof val === "string") el.textContent = val;
      });
    }

    function setVersion(version) {
      const el = document.getElementById("splash-version");
      if (el && typeof version === "string" && version.length > 0) {
        el.textContent = "v" + version;
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
      window.setTimeout(function () {
        text.textContent = label;
        text.classList.remove("is-swapping");
      }, 140);
      dot.style.animation = "none";
      void dot.offsetHeight;
      dot.style.animation = "";
    }

    function setSublabel(text) {
      const el = document.getElementById("splash-sublabel");
      if (!el) return;
      const trimmed = typeof text === "string" ? text.trim() : "";
      if (trimmed.length === 0) {
        el.textContent = "";
        el.classList.remove("is-visible");
      } else {
        el.textContent = trimmed;
        el.classList.add("is-visible");
      }
    }

    function setElapsed(elapsedMs) {
      const el = document.getElementById("splash-elapsed");
      if (!el || typeof elapsedMs !== "number" || elapsedMs < 0) return;
      const totalSeconds = elapsedMs / 1000;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = (totalSeconds - minutes * 60).toFixed(1);
      el.textContent = minutes > 0 ? minutes + ":" + seconds.padStart(4, "0") : seconds + "s";
  }

  function fadeOut() {
    const root = document.querySelector(".splash");
    if (!root) return;
    root.classList.add("is-fading");
  }

  const api = {
    setProgress: setProgress,
    setPhase: setPhase,
    setSublabel: setSublabel,
    setElapsed: setElapsed,
    setVersion: setVersion,
    applyI18n: applyI18n,
    fadeOut: fadeOut,
  };

  window.splash = api;

  if (window.openmeSplash) {
    const bridge = window.openmeSplash;
    if (typeof bridge.onProgress === "function") {
      bridge.onProgress(function (payload) {
        if (payload && typeof payload.percent === "number") setProgress(payload.percent);
        if (payload && typeof payload.phase === "string" && typeof payload.lang === "string") {
          setPhase(payload.phase, payload.lang);
        }
        if (payload && typeof payload.sublabel === "string") setSublabel(payload.sublabel);
        if (payload && typeof payload.elapsedMs === "number") setElapsed(payload.elapsedMs);
      });
    }
    if (typeof bridge.onInit === "function") {
      bridge.onInit(function (payload) {
        if (payload && typeof payload.lang === "string") applyI18n(resolveLang(payload.lang));
        if (payload && typeof payload.version === "string") setVersion(payload.version);
      });
    }
    if (typeof bridge.onLangChange === "function") {
      bridge.onLangChange(function (lang) {
        applyI18n(resolveLang(lang));
      });
    }
    if (typeof bridge.onSublabel === "function") {
      bridge.onSublabel(function (text) {
        setSublabel(text);
      });
    }
    if (typeof bridge.onMetric === "function") {
      bridge.onMetric(function (payload) {
        if (payload && typeof payload.elapsedMs === "number") setElapsed(payload.elapsedMs);
      });
    }
    if (typeof bridge.onFade === "function") {
      bridge.onFade(function () {
        fadeOut();
      });
    }
  }
})();