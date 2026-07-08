import React, { useCallback, useEffect, useRef } from "react";
import { useI18n } from "../i18n";
import { useSettings, type LineNumbersChoice, type RecentLimit, type TabSize, type WordWrapChoice } from "../settings";
import "./SettingsDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: Props) {
  const { t } = useI18n();
  const { settings, update, reset } = useSettings();
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // ESC dismisses.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus the dialog when it opens for keyboard / screen-reader users.
  useEffect(() => {
    if (open) {
      // Defer one frame so the element exists in the DOM.
      requestAnimationFrame(() => { cardRef.current?.focus(); });
    }
  }, [open]);

  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="settings-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={cardRef}
        className="settings-dialog-card"
        tabIndex={-1}
      >
        <header className="settings-dialog-header">
          <div className="settings-dialog-title-wrap">
            <h2 id="settings-dialog-title" className="settings-dialog-title">{t("settingsTitle")}</h2>
            <p className="settings-dialog-tagline">{t("settingsTagline")}</p>
          </div>
          <button
            type="button"
            className="settings-dialog-close"
            aria-label={t("settingsCloseAria")}
            title={t("settingsCloseAria")}
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </header>

        <div className="settings-dialog-body">
          <section className="settings-dialog-section" aria-labelledby="settings-theme-title">
            <h3 id="settings-theme-title" className="settings-dialog-section-title">{t("settingsThemeTitle")}</h3>
            <p className="settings-dialog-section-desc">{t("settingsThemeDesc")}</p>
            <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-theme-title">
              <label className={`settings-radio${settings.theme === "dark" ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={settings.theme === "dark"}
                  onChange={() => update("theme", "dark")}
                />
                <span className="settings-radio-dot" aria-hidden="true" />
                <span>{t("settingsThemeDark")}</span>
              </label>
              <label className={`settings-radio${settings.theme === "light" ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={settings.theme === "light"}
                  onChange={() => update("theme", "light")}
                />
                <span className="settings-radio-dot" aria-hidden="true" />
                <span>{t("settingsThemeLight")}</span>
              </label>
            </div>
          </section>

          <section className="settings-dialog-section" aria-labelledby="settings-close-confirm-title">
            <h3 id="settings-close-confirm-title" className="settings-dialog-section-title">{t("settingsCloseConfirmTitle")}</h3>
            <p className="settings-dialog-section-desc">{t("settingsCloseConfirmDesc")}</p>
            <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-close-confirm-title">
              <label className={`settings-radio${settings.confirmTabClose ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="confirmTabClose"
                  value="on"
                  checked={settings.confirmTabClose}
                  onChange={() => update("confirmTabClose", true)}
                />
                <span className="settings-radio-dot" aria-hidden="true" />
                <span>{t("settingsCloseConfirmOn")}</span>
              </label>
              <label className={`settings-radio${!settings.confirmTabClose ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="confirmTabClose"
                  value="off"
                  checked={!settings.confirmTabClose}
                  onChange={() => update("confirmTabClose", false)}
                />
                <span className="settings-radio-dot" aria-hidden="true" />
                <span>{t("settingsCloseConfirmOff")}</span>
              </label>
            </div>
          </section>

          <section className="settings-dialog-section" aria-labelledby="settings-recent-title">
            <h3 id="settings-recent-title" className="settings-dialog-section-title">{t("settingsRecentTitle")}</h3>
            <p className="settings-dialog-section-desc">{t("settingsRecentDesc")}</p>
            <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-recent-title">
              {([10, 25, 50] as const).map((limit) => (
                <label
                  key={limit}
                  className={`settings-radio${settings.recentLimit === limit ? " is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="recentLimit"
                    value={limit}
                    checked={settings.recentLimit === limit}
                    onChange={() => update("recentLimit", limit as RecentLimit)}
                  />
                  <span className="settings-radio-dot" aria-hidden="true" />
                  <span>{t(`settingsRecentLimit${limit}` as "settingsRecentLimit10" | "settingsRecentLimit25" | "settingsRecentLimit50")}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="settings-dialog-section" aria-labelledby="settings-editor-title">
            <h3 id="settings-editor-title" className="settings-dialog-section-title">{t("settingsEditorTitle")}</h3>
            <p className="settings-dialog-section-desc">{t("settingsEditorDesc")}</p>

            <div className="settings-subsection" aria-labelledby="settings-tab-size-title">
              <h4 id="settings-tab-size-title" className="settings-subsection-title">{t("settingsTabSizeTitle")}</h4>
              <p className="settings-subsection-desc">{t("settingsTabSizeDesc")}</p>
              <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-tab-size-title">
                {([2, 4, 8] as const).map((size) => (
                  <label
                    key={size}
                    className={`settings-radio${settings.tabSize === size ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="tabSize"
                      value={size}
                      checked={settings.tabSize === size}
                      onChange={() => update("tabSize", size as TabSize)}
                    />
                    <span className="settings-radio-dot" aria-hidden="true" />
                    <span>{t(`settingsTabSize${size}` as "settingsTabSize2" | "settingsTabSize4" | "settingsTabSize8")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="settings-subsection" aria-labelledby="settings-line-numbers-title">
              <h4 id="settings-line-numbers-title" className="settings-subsection-title">{t("settingsLineNumbersTitle")}</h4>
              <p className="settings-subsection-desc">{t("settingsLineNumbersDesc")}</p>
              <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-line-numbers-title">
                {(["on", "off"] as const).map((choice) => (
                  <label
                    key={choice}
                    className={`settings-radio${settings.lineNumbers === choice ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="lineNumbers"
                      value={choice}
                      checked={settings.lineNumbers === choice}
                      onChange={() => update("lineNumbers", choice as LineNumbersChoice)}
                    />
                    <span className="settings-radio-dot" aria-hidden="true" />
                    <span>{t(choice === "on" ? "settingsLineNumbersOn" : "settingsLineNumbersOff")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="settings-subsection" aria-labelledby="settings-word-wrap-title">
              <h4 id="settings-word-wrap-title" className="settings-subsection-title">{t("settingsWordWrapTitle")}</h4>
              <p className="settings-subsection-desc">{t("settingsWordWrapDesc")}</p>
              <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-word-wrap-title">
                {(["on", "off"] as const).map((choice) => (
                  <label
                    key={choice}
                    className={`settings-radio${settings.wordWrap === choice ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="wordWrap"
                      value={choice}
                      checked={settings.wordWrap === choice}
                      onChange={() => update("wordWrap", choice as WordWrapChoice)}
                    />
                    <span className="settings-radio-dot" aria-hidden="true" />
                    <span>{t(choice === "on" ? "settingsWordWrapOn" : "settingsWordWrapOff")}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        <footer className="settings-dialog-footer">
          <button
            type="button"
            className="settings-dialog-reset"
            aria-label={t("settingsResetButtonAria")}
            onClick={reset}
          >
            {t("settingsResetButton")}
          </button>
          <button
            type="button"
            className="settings-dialog-primary"
            onClick={onClose}
          >
            {t("settingsClose")}
          </button>
        </footer>
      </div>
    </div>
  );
}