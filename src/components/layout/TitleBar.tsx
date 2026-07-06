import { useEffect, useState } from "react";

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => { window.electronAPI.windowIsMaximized().then(setMaximized).catch(() => undefined); }, []);
  const toggleMaximize = async () => {
    await window.electronAPI.windowMaximize();
    setMaximized(await window.electronAPI.windowIsMaximized());
  };
  return (
    <header className="app-titlebar">
      <div className="titlebar-brand no-drag">
        <img className="brand-token" src="./openme-logo-64.png" alt="" aria-hidden="true" /><span>OPENME</span>
        <span className="titlebar-separator" aria-hidden="true" /><span className="titlebar-context">文件工作台</span>
      </div>
      <div className="titlebar-level" aria-label="当前工作区"><span className="level-pip" aria-hidden="true" />WORLD 1–1</div>
      <div className="window-controls no-drag">
        <button type="button" aria-label="最小化窗口" onClick={() => window.electronAPI.windowMinimize()}><svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12"><path d="M2 8.5h8" /></svg></button>
        <button type="button" aria-label={maximized ? "还原窗口" : "最大化窗口"} onClick={toggleMaximize}><svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12">{maximized ? <><rect x="3" y="2" width="7" height="7" rx="1" /><path d="M8 9v1H2V4h1" /></> : <rect x="2" y="2" width="8" height="8" rx="1" />}</svg></button>
        <button type="button" className="window-close" aria-label="关闭窗口" onClick={() => window.electronAPI.windowClose()}><svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12"><path d="m2.5 2.5 7 7m0-7-7 7" /></svg></button>
      </div>
    </header>
  );
}
