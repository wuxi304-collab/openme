import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { ElectronAPI } from "../types/electron-api";
import "./AboutDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PROJECT_REPO = "https://github.com/wuxi304-collab/openme";
const PROJECT_DOCS = `${PROJECT_REPO}#readme`;
const PROJECT_ISSUES = `${PROJECT_REPO}/issues/new`;

// Static fallback used in browser dev mode when window.electronAPI is
// a no-op shim (see src/main.tsx). Either an empty string or "—".
const UNKNOWN = "—";

// Read electronAPI defensively so a missing preload (browser dev) still
// renders the dialog instead of crashing on a TypeError.
function getApi(): ElectronAPI | null {
  if (typeof window === "undefined") return null;
  const api = (window as { electronAPI?: ElectronAPI }).electronAPI;
  return api ?? null;
}

export default function AboutDialog({ open, onClose }: Props) {
  const { t, lang } = useI18n();
  const [version, setVersion] = useState<string>("");
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Pull the app version once when the dialog opens. The bridge returns
  // a Promise<string> from app.getVersion(); in browser mode the noop
  // shim resolves to null and we fall back to a placeholder.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const api = getApi();
    if (!api?.getAppVersion) {
      setVersion("");
      return () => { cancelled = true; };
    }
    api.getAppVersion()
      .then((v) => { if (!cancelled) setVersion(typeof v === "string" ? v : ""); })
      .catch(() => { if (!cancelled) setVersion(""); });
    return () => { cancelled = true; };
  }, [open]);

  // ESC closes; arrow keys intentionally ignored (nothing to navigate).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) onClose();
  }, [onClose]);

  const handleCopyVersion = useCallback(() => {
    const platform = typeof navigator !== "undefined" ? (navigator.platform || UNKNOWN) : UNKNOWN;
    const lines = [
      `OpenMe Qiwu ${version || UNKNOWN}`,
      `platform: ${platform}`,
      `locale: ${lang}`,
    ];
    const text = lines.join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
  }, [version, lang]);

  if (!open) return null;

  const localeDisplay = lang === "zh" ? "中文" : "English";
  const platformDisplay = (typeof navigator !== "undefined" && navigator.platform) ? navigator.platform : UNKNOWN;
  const versionDisplay = version || UNKNOWN;

  return (
    <div
      ref={overlayRef}
      className="about-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
      onClick={handleOverlayClick}
    >
      <div className="about-dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="about-dialog-header">
          <img className="about-dialog-logo" src="./openme-logo-64.png" alt="" aria-hidden="true" />
          <div className="about-dialog-title-wrap">
            <h2 id="about-dialog-title" className="about-dialog-title">{t("aboutTitle")}</h2>
            <p className="about-dialog-tagline">{t("aboutTagline")}</p>
          </div>
          <button type="button" className="about-dialog-close" aria-label={t("aboutClose")} title={t("aboutClose")} onClick={onClose}>
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="m3 3 6 6m0-6-6 6" /></svg>
          </button>
        </header>

        <section className="about-dialog-section" aria-label={t("aboutVersion")}>
          <h3 className="about-dialog-section-title">{t("aboutVersion")}</h3>
          <dl className="about-dialog-info-list">
            <div className="about-dialog-info-row">
              <dt>{t("aboutVersion")}</dt>
              <dd>
                <span className="about-dialog-version-value">{versionDisplay}</span>
                <button type="button" className="about-dialog-copy" aria-label={t("aboutCopyVersion")} title={t("aboutCopyVersion")} onClick={handleCopyVersion}>
                  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" />
                    <path d="M2 8.5V2.5h6" fill="none" stroke="currentColor" />
                  </svg>
                </button>
              </dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutPlatform")}</dt><dd>{platformDisplay}</dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutLocale")}</dt><dd>{localeDisplay}</dd>
            </div>
          </dl>
        </section>

        <section className="about-dialog-section" aria-label={t("aboutShortcutsTitle")}>
          <h3 className="about-dialog-section-title">{t("aboutShortcutsTitle")}</h3>
          <table className="about-dialog-shortcuts">
            <tbody>
              <tr><th>Ctrl + O</th><td>{t("aboutShortcutOpen")}</td></tr>
              <tr><th>Ctrl + S</th><td>{t("aboutShortcutSave")}</td></tr>
              <tr><th>Ctrl + K</th><td>{t("aboutShortcutPalette")}</td></tr>
              <tr><th>Ctrl + W</th><td>{t("aboutShortcutCloseTab")}</td></tr>
              <tr><th>Ctrl + Tab</th><td>{t("aboutShortcutSwitchTab")}</td></tr>
              <tr><th>Alt + 1–9</th><td>{t("aboutShortcutJumpTab")}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="about-dialog-section" aria-label={t("aboutResourcesTitle")}>
          <h3 className="about-dialog-section-title">{t("aboutResourcesTitle")}</h3>
          <div className="about-dialog-resources">
            <a className="about-dialog-link" href={PROJECT_DOCS} target="_blank" rel="noreferrer noopener">{t("aboutDoc")}</a>
            <a className="about-dialog-link" href={PROJECT_REPO} target="_blank" rel="noreferrer noopener">{t("aboutViewOnGithub")}</a>
            <a className="about-dialog-link" href={PROJECT_ISSUES} target="_blank" rel="noreferrer noopener">{t("aboutReportIssue")}</a>
          </div>
        </section>

        <footer className="about-dialog-footer">
          <button type="button" className="about-dialog-primary" onClick={onClose}>{t("aboutClose")}</button>
        </footer>
      </div>
    </div>
  );
}
