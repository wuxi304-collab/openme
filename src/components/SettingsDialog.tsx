import React, { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { useSettings, type LineNumbersChoice, type RecentLimit, type TabSize, type WordWrapChoice, parseSettingsFile, serializeSettings } from "../settings";
import { useToast } from "./useToast";
import { useConfirm } from "./useConfirm";
import { isIpcFailure, describeIpcError } from "../core/ipcError";
import "./SettingsDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: Props) {
  const { t, tf } = useI18n();
  const { settings, update, reset, replaceAll } = useSettings();
  const { pushToast } = useToast();
  const confirm = useConfirm();
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
      const resettingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleExport = useCallback(async () => {
    if (!window.electronAPI?.exportSettingsToFile) {
      pushToast("error", t("ipcUnknownError"));
      return;
    }
    const payload = serializeSettings(settings, { name: "OpenMe Qiwu", version: "1.0.0" });
    const result = await window.electronAPI.exportSettingsToFile(payload, "openme-settings.json");
    if ("canceled" in result && result.canceled) return;
    if (isIpcFailure(result)) {
      pushToast("error", describeIpcError(t, result));
      return;
    }
    if (result.ok) pushToast("success", tf("settingsSyncExportSuccess", { path: result.path }));
  }, [settings, pushToast, t, tf]);

  const handleImport = useCallback(async () => {
    if (!window.electronAPI?.importSettingsFromFile) {
      pushToast("error", t("ipcUnknownError"));
      return;
    }
    const result = await window.electronAPI.importSettingsFromFile();
    if ("canceled" in result && result.canceled) return;
    if (isIpcFailure(result)) {
      const code = (result as { code?: string }).code;
      if (code === "SETTINGS_IMPORT_INVALID_JSON") {
        pushToast("error", t("settingsSyncImportInvalidJson"));
      } else {
        pushToast("error", describeIpcError(t, result));
      }
      return;
    }
    if (!result.ok) return;
    const parsed = parseSettingsFile(result.data);
    if (!parsed.ok) {
      const key = parsed.reason === "invalid-json" ? "settingsSyncImportInvalidJson" : "settingsSyncImportWrongShape";
      pushToast("error", t(key));
      return;
    }
    const ok = await confirm({
      title: t("settingsSyncImportConfirmTitle"),
      message: t("settingsSyncImportConfirmMessage"),
      confirmLabel: t("settingsSyncImportConfirm"),
      cancelLabel: t("settingsSyncImportCancel"),
      variant: "default",
    });
    if (!ok) return;
    replaceAll(parsed.settings);
    pushToast("success", t("settingsSyncImportSuccess"));
  }, [confirm, pushToast, replaceAll, t]);

      const handleReset = useCallback(async () => {
        const ok = await confirm({
          title: t("settingsResetConfirmTitle"),
          message: t("settingsResetConfirmMessage"),
          confirmLabel: t("settingsResetConfirmConfirm"),
          cancelLabel: t("settingsResetConfirmCancel"),
          variant: "default",
        });
        if (!ok) return;
        reset();
              // Briefly flash the radio pills so the user sees the values snap back.
              const card = cardRef.current;
              if (card) {
                if (resettingTimerRef.current) clearTimeout(resettingTimerRef.current);
                card.classList.add("is-resetting");
                resettingTimerRef.current = setTimeout(() => card.classList.remove("is-resetting"), 720);
              }
            }, [confirm, reset, t]);

      const handleRevealStorage = useCallback(() => {
        const api = window.electronAPI;
        if (!api?.revealInFolder || !storagePath) return;
        void api.revealInFolder(storagePath);
      }, [storagePath]);

      const handleCopyStoragePath = useCallback(async () => {
        if (!storagePath) return;
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(storagePath);
          } else {
            // Fallback for older webviews without async clipboard API.
            const ta = document.createElement("textarea");
            ta.value = storagePath;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
          }
          setCopied(true);
          if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
          copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
        } catch {
          pushToast("error", t("ipcUnknownError"));
        }
      }, [pushToast, storagePath, t]);

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

  // Reset transient state every time the dialog opens so a previous
  // "Copied" tooltip or stale path doesn't linger across sessions.
  useEffect(() => {
      if (!open) return;
      setCopied(false);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }, [open]);

  // Fetch the settings storage path (userData). Only available when
  // running inside Electron — gracefully degrade in browser mode.
  useEffect(() => {
      if (!open) return;
      let cancelled = false;
      const api = window.electronAPI;
      if (!api?.getSettingsStoragePath) {
        setStoragePath(null);
        return;
      }
      api.getSettingsStoragePath()
        .then((result) => {
          if (cancelled) return;
          if (isIpcFailure(result)) {
            setStoragePath(null);
          } else {
            setStoragePath(result.path);
          }
        })
        .catch(() => {
          if (cancelled) return;
          setStoragePath(null);
        });
      return () => {
        cancelled = true;
      };
    }, [open]);

  // Clean up any pending timer on unmount.
  useEffect(() => {
      return () => {
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
          if (resettingTimerRef.current) clearTimeout(resettingTimerRef.current);
        };
      }, []);

  // Focus trap: cycle Tab / Shift+Tab within the dialog card so keyboard
  // users can't escape into the page background.
  useEffect(() => {
      if (!open) return;
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;
        const card = cardRef.current;
        if (!card) return;
        const focusable = card.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const focusableArr = Array.from(focusable).filter((el) => !el.hasAttribute("disabled"));
        if (focusableArr.length === 0) return;
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
                      <p id="settings-theme-desc" className="settings-dialog-section-desc">{t("settingsThemeDesc")}</p>
                      <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-theme-title" aria-describedby="settings-theme-desc">
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
                      <p id="settings-close-confirm-desc" className="settings-dialog-section-desc">{t("settingsCloseConfirmDesc")}</p>
                      <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-close-confirm-title" aria-describedby="settings-close-confirm-desc">
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
                      <p id="settings-recent-desc" className="settings-dialog-section-desc">{t("settingsRecentDesc")}</p>
                      <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-recent-title" aria-describedby="settings-recent-desc">
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
                          <p id="settings-tab-size-desc" className="settings-subsection-desc">{t("settingsTabSizeDesc")}</p>
                          <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-tab-size-title" aria-describedby="settings-tab-size-desc">
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
                          <p id="settings-line-numbers-desc" className="settings-subsection-desc">{t("settingsLineNumbersDesc")}</p>
                          <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-line-numbers-title" aria-describedby="settings-line-numbers-desc">
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
                          <p id="settings-word-wrap-desc" className="settings-subsection-desc">{t("settingsWordWrapDesc")}</p>
                          <div className="settings-radio-group" role="radiogroup" aria-labelledby="settings-word-wrap-title" aria-describedby="settings-word-wrap-desc">
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

          <section className="settings-dialog-section" aria-labelledby="settings-sync-title">
            <h3 id="settings-sync-title" className="settings-dialog-section-title">{t("settingsSyncSectionTitle")}</h3>
            <p className="settings-dialog-section-desc">{t("settingsSyncSectionDesc")}</p>
                      <div className="settings-storage-path" role="group" aria-labelledby="settings-storage-path-label">
                        <p id="settings-storage-path-label" className="settings-storage-path-label">{t("settingsStoragePathLabel")}</p>
                        <div className="settings-storage-path-row">
                          <code
                            className="settings-storage-path-value"
                            aria-describedby="settings-storage-path-hint"
                            title={storagePath ?? ""}
                          >
                            {storagePath ?? t("settingsStoragePathUnknown")}
                          </code>
                          <div className="settings-storage-path-actions">
                            <button
                              type="button"
                              className="settings-dialog-secondary settings-storage-path-action"
                              onClick={handleCopyStoragePath}
                              disabled={!storagePath}
                                                          data-copied={copied ? "true" : "false"}
                                                          aria-label={t("settingsStoragePathCopyAria")}
                                                          title={t("settingsStoragePathCopyAria")}
                                                        >
                                                          {copied ? t("settingsStoragePathCopied") : t("settingsStoragePathCopy")}
                                                        </button>
                            <button
                              type="button"
                              className="settings-dialog-secondary settings-storage-path-action"
                              onClick={handleRevealStorage}
                              disabled={!storagePath}
                              aria-label={t("settingsStoragePathRevealAria")}
                              title={t("settingsStoragePathRevealAria")}
                            >
                              {t("settingsStoragePathReveal")}
                            </button>
                          </div>
                        </div>
                        <p id="settings-storage-path-hint" className="settings-storage-path-hint">
                          {t("settingsStoragePathHint")}
                        </p>
                      </div>
                      <div className="settings-sync-actions">
              <button
                type="button"
                className="settings-dialog-secondary"
                aria-label={t("settingsSyncExportButtonAria")}
                onClick={handleExport}
              >
                {t("settingsSyncExportButton")}
              </button>
              <button
                type="button"
                className="settings-dialog-secondary"
                aria-label={t("settingsSyncImportButtonAria")}
                onClick={handleImport}
              >
                {t("settingsSyncImportButton")}
              </button>
            </div>
          </section>
        </div>

        <footer className="settings-dialog-footer">
          <button
            type="button"
            className="settings-dialog-reset"
            aria-label={t("settingsResetButtonAria")}
                    onClick={handleReset}
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