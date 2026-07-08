import React, { createContext, useContext, useEffect, useState } from "react";

export const translations: Record<string, Record<string, string>> = {
  zh: {
    appName: "文件工作台",
    world: "WORLD 1–1",
    minimize: "最小化窗口",
    maximize: "最大化窗口",
    restore: "还原窗口",
    close: "关闭窗口",
    light: "明亮",
    dark: "暗色",
    language: "语言",
    chinese: "中文",
    english: "English",
    selectFile: "选择文件",
    openInSystem: "用系统程序打开",
  },
  en: {
    appName: "File Workbench",
    world: "WORLD 1–1",
    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
    close: "Close",
    light: "Light",
    dark: "Dark",
    language: "Language",
    chinese: "中文",
    english: "English",
    selectFile: "Select files",
    openInSystem: "Open in system",
  }
};

type Lang = "zh" | "en";
const STORAGE_KEY = "openme.lang";

const I18nContext = createContext({
  lang: "zh" as Lang,
  setLang: (_l: Lang) => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === "en") return "en" as Lang;
    } catch (e) {}
    return "zh" as Lang;
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { }
  }, [lang]);
  const setLang = (next: Lang) => setLangState(next);
  const t = (key: string) => {
    return (translations[lang] && translations[lang][key]) ? translations[lang][key] : key;
  };
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }
