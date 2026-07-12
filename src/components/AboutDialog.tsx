import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { ElectronAPI, RuntimeInfo } from "../types/electron-api";
import "./AboutDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PROJECT_REPO = "https://github.com/wuxi304-collab/openme";
const PROJECT_DOCS = `${PROJECT_REPO}#readme`;
const PROJECT_ISSUES = `${PROJECT_REPO}/issues/new`;
const PROJECT_LICENSE = `${PROJECT_REPO}/blob/main/LICENSE`;
const PUBLISHER_WECHAT = "wuxi3042205";

// Static fallback used in browser dev mode when window.electronAPI is
// a no-op shim (see src/main.tsx). Either an empty string or "—".
const UNKNOWN = "—";

// Curated list of open-source libraries the app actually loads at runtime.
// Keep the list in sync with package.json — the order matches the
// section sub-title "alphabetical".
const ACKNOWLEDGEMENTS: ReadonlyArray<{ name: string; purposeKey: string }> = [
  { name: "Electron", purposeKey: "aboutAckPurposeElectron" },
  { name: "React", purposeKey: "aboutAckPurposeReact" },
  { name: "Monaco Editor", purposeKey: "aboutAckPurposeMonacoEditor" },
  { name: "PDF.js", purposeKey: "aboutAckPurposePdfJs" },
  { name: "Three.js", purposeKey: "aboutAckPurposeThreeJs" },
  { name: "Mammoth", purposeKey: "aboutAckPurposeMammoth" },
  { name: "SheetJS", purposeKey: "aboutAckPurposeSheetJs" },
  { name: "JSZip", purposeKey: "aboutAckPurposeJsZip" },
  { name: "EPUB.js", purposeKey: "aboutAckPurposeEpubJs" },
  { name: "opentype.js", purposeKey: "aboutAckPurposeOpentypeJs" },
];

// Read electronAPI defensively so a missing preload (browser dev / unit
// tests) still renders the dialog instead of crashing on a TypeError. The
// global Window type declares electronAPI as ElectronAPI, so we widen it
// to optional only locally — main.tsx's shim guarantees the value at
// runtime in production and browser dev.
function getApi(): ElectronAPI | null {
  if (typeof window === "undefined") return null;
  const api: ElectronAPI | undefined = (window as { electronAPI?: ElectronAPI | undefined }).electronAPI;
  return api ?? null;
}

// Render the runtime summary the user gets when they click "Copy".
// Kept identical structurally across locales — English values are used
// for the labels so copy-pasted text is debug-friendly in either locale.
function buildRuntimeText(info: RuntimeInfo | null, version: string): string {
  const lines = [
    `OpenMe Qiwu ${version || UNKNOWN}`,
    `electron: ${info?.electron || UNKNOWN}`,
    `chromium: ${info?.chrome || UNKNOWN}`,
    `node: ${info?.node || UNKNOWN}`,
    `os: ${info?.osName || info?.osPlatform || UNKNOWN}`,
    `arch: ${info?.osArch || UNKNOWN}`,
    `locale: ${info?.systemLocale || UNKNOWN}`,
  ];
  return lines.join("\n");
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function AboutDialog({ open, onClose }: Props) {
  const { t, tf, lang } = useI18n();
  const [version, setVersion] = useState<string>("");
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
    const [copyState, setCopyState] = useState<"" | "version" | "runtime" | "wechat">("");
  const copyTimer = useRef<number | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Pull app version + runtime snapshot once when the dialog opens. We
  // guard each call so a missing preload (browser dev mode / jsdom) still
  // renders the dialog with placeholder dashes instead of crashing.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const api = getApi();
    if (!api) {
      setVersion("");
      setRuntime(null);
      return () => { cancelled = true; };
    }
    const versionPromise = api.getAppVersion?.();
    if (versionPromise && typeof versionPromise.then === "function") {
      versionPromise
        .then((v) => { if (!cancelled) setVersion(typeof v === "string" ? v : ""); })
        .catch(() => { if (!cancelled) setVersion(""); });
    } else {
      setVersion("");
    }
    const runtimePromise = api.getRuntimeInfo?.();
    if (runtimePromise && typeof runtimePromise.then === "function") {
      runtimePromise
        .then((info) => { if (!cancelled) setRuntime(info ?? null); })
        .catch(() => { if (!cancelled) setRuntime(null); });
    } else {
      setRuntime(null);
    }
    return () => { cancelled = true; };
  }, [open]);

  // Reset transient copy indicator whenever the dialog closes so the next
  // open starts clean.
  useEffect(() => {
    if (open) return;
    setCopyState("");
    if (copyTimer.current !== null) {
      window.clearTimeout(copyTimer.current);
      copyTimer.current = null;
    }
  }, [open]);

  // ESC closes; arrow keys intentionally ignored (nothing to navigate).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus trap: cycle Tab / Shift+Tab within the dialog card so keyboard
  // users cannot escape into the page background. Mirrors the Settings dialog.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const focusable = card.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const focusableArr = Array.from(focusable);
      const first = focusableArr[0]!;
      const last = focusableArr[focusableArr.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !card.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !card.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Capture the trigger element on open so we can restore focus on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
  }, [open]);

  // Restore focus to whichever element was active before opening, once
  // the dialog has unmounted.
  useEffect(() => {
    if (open) return;
    const target = previouslyFocusedRef.current;
    if (!target || typeof target.focus !== "function") return;
    const handle = window.setTimeout(() => {
      if (document.body.contains(target)) target.focus();
      previouslyFocusedRef.current = null;
    }, 0);
    return () => window.clearTimeout(handle);
  }, [open]);

  // Clear the transient "Copied" indicator after ~1.4s so it returns to
  // its resting state without flicker.
  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  const flashCopy = useCallback((kind: "version" | "runtime" | "wechat") => {
    setCopyState(kind);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => {
      setCopyState("");
      copyTimer.current = null;
    }, 1400);
  }, []);

    const handleCopyWechat = useCallback(async () => {
      const ok = await copyToClipboard(PUBLISHER_WECHAT);
      if (ok) flashCopy("wechat");
    }, [flashCopy]);

  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) onClose();
  }, [onClose]);

  const handleCopyVersion = useCallback(async () => {
    const platform = typeof navigator !== "undefined" ? (navigator.platform || UNKNOWN) : UNKNOWN;
    const lines = [
      `OpenMe Qiwu ${version || UNKNOWN}`,
      `platform: ${platform}`,
      `locale: ${lang}`,
    ];
    const ok = await copyToClipboard(lines.join("\n"));
    if (ok) flashCopy("version");
  }, [version, lang, flashCopy]);

  const handleCopyRuntime = useCallback(async () => {
    const ok = await copyToClipboard(buildRuntimeText(runtime, version));
    if (ok) flashCopy("runtime");
  }, [runtime, version, flashCopy]);

  if (!open) return null;

  const localeDisplay = lang === "zh" ? t("aboutLocaleNameZh") : t("aboutLocaleNameEn");
  const versionDisplay = version || UNKNOWN;
  const electronDisplay = runtime?.electron || UNKNOWN;
  const chromeDisplay = runtime?.chrome || UNKNOWN;
  const nodeDisplay = runtime?.node || UNKNOWN;
  const v8Display = runtime?.v8 || UNKNOWN;
  const osDisplay = runtime?.osName || runtime?.osPlatform || UNKNOWN;
  const archDisplay = runtime?.osArch || UNKNOWN;
  const hostnameDisplay = runtime?.hostname || UNKNOWN;
  const systemLocaleDisplay = runtime?.systemLocale || UNKNOWN;
  const cpusDisplay = runtime && typeof runtime.cpus === "number"
    ? tf("aboutCpusCount", { n: runtime.cpus })
    : UNKNOWN;
  const memoryDisplay = runtime && typeof runtime.totalMemGb === "number"
    ? tf("aboutMemoryGb", { n: runtime.totalMemGb })
    : UNKNOWN;

  return (
    <div
      ref={overlayRef}
      className="about-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
      onClick={handleOverlayClick}
    >
      <div className="about-dialog-card" ref={cardRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
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
                <button
                  type="button"
                  className={`about-dialog-copy${copyState === "version" ? " is-copied" : ""}`}
                  aria-label={t("aboutCopyVersion")}
                  title={copyState === "version" ? t("aboutCopiedAria") : t("aboutCopyVersion")}
                  onClick={handleCopyVersion}
                >
                  {copyState === "version" ? (
                    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="m2.5 6.2 2.4 2.4 4.6-4.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" />
                      <path d="M2 8.5V2.5h6" fill="none" stroke="currentColor" />
                    </svg>
                  )}
                </button>
              </dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutPlatform")}</dt><dd>{osDisplay}</dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutLocale")}</dt><dd>{localeDisplay}</dd>
            </div>
          </dl>
        </section>

        <section className="about-dialog-section" aria-label={t("aboutRuntimeTitle")}>
          <h3 className="about-dialog-section-title">{t("aboutRuntimeTitle")}</h3>
          <dl className="about-dialog-info-list">
            <div className="about-dialog-info-row">
              <dt>{t("aboutRuntimeElectron")}</dt>
              <dd>{electronDisplay}</dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutRuntimeChrome")}</dt>
              <dd>{chromeDisplay}</dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutRuntimeNode")}</dt>
              <dd>{nodeDisplay}</dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutRuntimeV8")}</dt>
              <dd>{v8Display}</dd>
            </div>
          </dl>
          <div className="about-dialog-copy-row">
            <button
              type="button"
              className={`about-dialog-copy-button${copyState === "runtime" ? " is-copied" : ""}`}
              onClick={handleCopyRuntime}
              title={copyState === "runtime" ? t("aboutCopyRuntimeCopiedAria") : t("aboutCopyRuntime")}
            >
              {copyState === "runtime" ? t("aboutCopyRuntimeCopied") : t("aboutCopyRuntime")}
            </button>
          </div>
        </section>

        <section className="about-dialog-section" aria-label={t("aboutSystemTitle")}>
          <h3 className="about-dialog-section-title">{t("aboutSystemTitle")}</h3>
          <dl className="about-dialog-info-list">
            <div className="about-dialog-info-row">
              <dt>{t("aboutSystemOs")}</dt>
              <dd>{osDisplay}</dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutSystemArch")}</dt>
              <dd>{archDisplay}</dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutSystemLocale")}</dt>
              <dd>{systemLocaleDisplay}</dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutSystemCpus")}</dt>
              <dd>{cpusDisplay}</dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutSystemMemory")}</dt>
              <dd>{memoryDisplay}</dd>
            </div>
            <div className="about-dialog-info-row">
              <dt>{t("aboutSystemHostname")}</dt>
              <dd className="about-dialog-hostname">{hostnameDisplay}</dd>
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

        <section className="about-dialog-section" aria-label={t("aboutAckTitle")}>
          <h3 className="about-dialog-section-title">{t("aboutAckTitle")}</h3>
          <p className="about-dialog-section-desc">{t("aboutAckDescription")}</p>
          <ul className="about-dialog-ack-list">
            {ACKNOWLEDGEMENTS.map((item) => (
              <li key={item.name} className="about-dialog-ack-item">
                <span className="about-dialog-ack-name">{item.name}</span>
                            <span className="about-dialog-ack-purpose">{t(item.purposeKey)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-dialog-section" aria-label={t("aboutLicenseTitle")}>
          <h3 className="about-dialog-section-title">{t("aboutLicenseTitle")}</h3>
          <p className="about-dialog-license-text">{t("aboutLicenseMit")}</p>
          <a className="about-dialog-link" href={PROJECT_LICENSE} target="_blank" rel="noreferrer noopener">{t("aboutLicenseLink")}</a>
        </section>

        <section className="about-dialog-section" aria-label={t("aboutResourcesTitle")}>
          <h3 className="about-dialog-section-title">{t("aboutResourcesTitle")}</h3>
          <div className="about-dialog-resources">
            <a className="about-dialog-link" href={PROJECT_DOCS} target="_blank" rel="noreferrer noopener">{t("aboutDoc")}</a>
            <a className="about-dialog-link" href={PROJECT_REPO} target="_blank" rel="noreferrer noopener">{t("aboutViewOnGithub")}</a>
            <a className="about-dialog-link" href={PROJECT_ISSUES} target="_blank" rel="noreferrer noopener">{t("aboutReportIssue")}</a>
          </div>
        </section>

                <section className="about-dialog-section about-dialog-publisher" aria-label={t("aboutPublisherTitle")}>
                  <h3 className="about-dialog-section-title">{t("aboutPublisherTitle")}</h3>
                  <div className="about-dialog-publisher-card">
                    <div className="about-dialog-publisher-name">{t("aboutPublisherName")}</div>
                    <p className="about-dialog-publisher-tagline">{t("aboutPublisherTagline")}</p>
                  </div>
                </section>

                <section className="about-dialog-section about-dialog-contact" aria-label={t("aboutContactTitle")}>
                  <h3 className="about-dialog-section-title">{t("aboutContactTitle")}</h3>
                  <p className="about-dialog-contact-intro">{t("aboutContactIntro")}</p>
                  <div className="about-dialog-contact-row">
                    <span className="about-dialog-contact-label">{t("aboutContactWechatLabel")}</span>
                    <code className="about-dialog-contact-id">{t("aboutContactWechatId")}</code>
                    <button
                      type="button"
                      className={`about-dialog-copy-button${copyState === "wechat" ? " is-copied" : ""}`}
                      onClick={handleCopyWechat}
                      aria-label={t("aboutContactWechatCopy")}
                      title={copyState === "wechat" ? t("aboutContactWechatCopied") : t("aboutContactWechatCopy")}
                    >
                      {copyState === "wechat" ? t("aboutContactWechatCopied") : t("aboutContactWechatCopy")}
                    </button>
                  </div>
                </section>

        <footer className="about-dialog-footer">
          <button type="button" className="about-dialog-primary" onClick={onClose}>{t("aboutClose")}</button>
        </footer>
      </div>
    </div>
  );
}
