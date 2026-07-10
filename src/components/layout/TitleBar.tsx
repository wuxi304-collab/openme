import { lazy, Suspense, useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { useTheme } from "../../theme";
import { SunIcon, MoonIcon } from "../icons/TitleBarIcons";

// Lazy-load the dialogs so their CSS + JS ship in a separate chunk. They're
// only rendered when the user opens them, so the initial bundle doesn't pay
// the cost of code that almost nobody touches in any given session.
const AboutDialog = lazy(() => import("../AboutDialog"));
const SettingsDialog = lazy(() => import("../SettingsDialog"));

export default function TitleBar() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const [maximized, setMaximized] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => { if (typeof window.electronAPI?.windowIsMaximized === "function") window.electronAPI.windowIsMaximized().then(setMaximized).catch(() => undefined); }, []);
  const toggleMaximize = async () => {
    try { await window.electronAPI.windowMaximize(); const state = await window.electronAPI.windowIsMaximized(); setMaximized(state); } catch { }
  };
  return (
    <header className="app-titlebar">
      <div className="titlebar-brand no-drag">
        <img className="brand-token" src="./openme-logo-64.png" alt="" aria-hidden="true" /><span>OPENME</span>
        <span className="titlebar-separator" aria-hidden="true" /><span className="titlebar-context">{t("appName")}</span>
            <span className="titlebar-publisher" aria-label={t("aboutPublisherTagline")} title={t("aboutPublisherTagline")}>
              <span className="titlebar-publisher-dot" aria-hidden="true" />
              <span className="titlebar-publisher-name">{t("aboutPublisherName")}</span>
            </span>
          </div>
      <div className="titlebar-level" aria-label={t("world")}><span className="level-pip" aria-hidden="true" />{t("world")}</div>
      <div className="window-controls no-drag">
        <button
          type="button"
          className="about-info-button"
                aria-label={t("settingsInfoButtonAria")}
                title={t("settingsInfoButtonTitle")}
                onClick={() => setSettingsOpen(true)}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
                  <path
                    d="M7 1.5 L8.2 2 L9 3 L10.5 3.2 L11 4.5 L12 5.7 L11.5 7 L12 8.3 L11 9.5 L10.5 10.8 L9 11 L8.2 12 L7 12.5 L5.8 12 L5 11 L3.5 10.8 L3 9.5 L2 8.3 L2.5 7 L2 5.7 L3 4.5 L3.5 3.2 L5 3 L5.8 2 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <circle cx="7" cy="7" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
              <button
                type="button"
                className="about-info-button"
                aria-label={t("aboutInfoButtonAria")}
                title={t("aboutInfoButtonTitle")}
                onClick={() => setAboutOpen(true)}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
                  <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="7" cy="4" r="0.85" fill="currentColor" />
                  <path d="M7 6.5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
        <label className="lang-select-label">
          <select className="lang-select" aria-label={t('language')} value={lang} onChange={(e) => setLang(e.target.value === 'en' ? 'en' : 'zh')}>
            <option value="zh">{t('chinese')}</option>
            <option value="en">{t('english')}</option>
          </select>
        </label>
        <button type="button" className="theme-toggle" title={theme === 'dark' ? t('light') : t('dark')} aria-label={theme === 'dark' ? t('light') : t('dark')} onClick={() => toggle()}>{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
        <button type="button" aria-label={t('minimize')} onClick={() => window.electronAPI.windowMinimize()}><svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12"><path d="M2 8.5h8" /></svg></button>
        <button type="button" aria-label={maximized ? t('restore') : t('maximize')} onClick={toggleMaximize}><svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12">{maximized ? <><rect x="3" y="2" width="7" height="7" rx="1" /><path d="M8 9v1H2V4h1" /></> : <rect x="2" y="2" width="8" height="8" rx="1" />}</svg></button>
        <button type="button" className="window-close" aria-label={t('close')} onClick={() => window.electronAPI.windowClose()}><svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12"><path d="m2.5 2.5 7 7m0-7-7 7" /></svg></button>
      </div>
      <Suspense fallback={null}>
        {aboutOpen && <AboutDialog open onClose={() => setAboutOpen(false)} />}
        {settingsOpen && <SettingsDialog open onClose={() => setSettingsOpen(false)} />}
      </Suspense>
    </header>
  );
}
