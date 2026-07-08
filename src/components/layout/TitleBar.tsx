import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { useTheme } from "../../theme";
import { SunIcon, MoonIcon } from "../icons/TitleBarIcons";

export default function TitleBar() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const [maximized, setMaximized] = useState(false);
  useEffect(() => { if (typeof (window as any).electronAPI?.windowIsMaximized === "function") (window as any).electronAPI.windowIsMaximized().then(setMaximized).catch(() => undefined); }, []);
  const toggleMaximize = async () => {
    try { await (window as any).electronAPI.windowMaximize(); const state = await (window as any).electronAPI.windowIsMaximized(); setMaximized(state); } catch { }
  };
  return (
    <header className="app-titlebar">
      <div className="titlebar-brand no-drag">
        <img className="brand-token" src="./openme-logo-64.png" alt="" aria-hidden="true" /><span>OPENME</span>
        <span className="titlebar-separator" aria-hidden="true" /><span className="titlebar-context">{t("appName")}</span>
      </div>
      <div className="titlebar-level" aria-label={t("world")}><span className="level-pip" aria-hidden="true" />{t("world")}</div>
      <div className="window-controls no-drag">
        <label className="lang-select-label">
          <select className="lang-select" aria-label={t('language')} value={lang} onChange={(e) => setLang(e.target.value === 'en' ? 'en' : 'zh')}>
            <option value="zh">{t('chinese')}</option>
            <option value="en">{t('english')}</option>
          </select>
        </label>
        <button type="button" className="theme-toggle" title={theme === 'dark' ? t('light') : t('dark')} aria-label={theme === 'dark' ? t('light') : t('dark')} onClick={() => toggle()}>{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
        <button type="button" aria-label={t('minimize')} onClick={() => (window as any).electronAPI.windowMinimize()}><svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12"><path d="M2 8.5h8" /></svg></button>
        <button type="button" aria-label={maximized ? t('restore') : t('maximize')} onClick={toggleMaximize}><svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12">{maximized ? <><rect x="3" y="2" width="7" height="7" rx="1" /><path d="M8 9v1H2V4h1" /></> : <rect x="2" y="2" width="8" height="8" rx="1" />}</svg></button>
        <button type="button" className="window-close" aria-label={t('close')} onClick={() => (window as any).electronAPI.windowClose()}><svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12"><path d="m2.5 2.5 7 7m0-7-7 7" /></svg></button>
      </div>
    </header>
  );
}
