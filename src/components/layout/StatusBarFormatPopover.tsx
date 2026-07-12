import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { getExternalAppHints } from "../../viewer-registry/externalApps";
import type { FileFormatDefinition, FileOpenStrategy, FileRiskLevel } from "../../file-registry";

interface Props {
  /** Anchor element — the popover positions itself relative to this trigger. */
  anchor: HTMLElement | null;
  /** Format definition looked up by extension. */
  format: FileFormatDefinition;
  /** File path used to look up suggested apps and to expose copy/reveal actions. */
  filePath: string;
  /** File extension used as the lookup key for external app hints. */
  extension: string;
  /** Open strategy / risk level feed the suggested-apps heuristic. */
  openStrategy?: FileOpenStrategy;
  riskLevel?: FileRiskLevel;
  /** Optional category — falls back to the format's category. */
  category?: string;
  /** Called when the popover should close (outside click, Escape, action). */
  onClose: () => void;
  /** Optional callback for "Open in system default app" (bottom CTA). */
  onOpenInSystem?: () => void;
}

/**
 * Popover anchored to the StatusBar support badge / format chip. Shows:
 *  - Format name + support level description
 *  - Suggested external apps (same data as FileSummaryPanel + OpenMeRouteCard)
 *  - Quick actions: copy file path, reveal in folder, open with system default
 *
 * Outside-click + Escape close it. The trigger is restored to focus on close
 * so keyboard users do not lose their place.
 */
export default function StatusBarFormatPopover({
  anchor,
  format,
  filePath,
  extension,
  openStrategy,
  riskLevel,
  category,
  onClose,
  onOpenInSystem,
}: Props) {
  const { t, tf } = useI18n();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [copyFlash, setCopyFlash] = useState<null | "path">(null);

    // Close + restore focus to the trigger. Centralised so outside-click, Escape,
    // and the close button all behave identically.
    const closeAndRestoreFocus = () => {
      onClose();
      // Defer focus so React has a chance to unmount the popover first; otherwise
      // the focus call lands on a detached node in some browsers.
      window.setTimeout(() => anchor?.focus(), 0);
    };

    // Close on outside click. Capture-phase so we beat any inner stopPropagation.
    useEffect(() => {
      if (!anchor) return;
      const handler = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (popoverRef.current?.contains(target)) return;
        if (anchor.contains(target)) return;
        closeAndRestoreFocus();
      };
      document.addEventListener("mousedown", handler, true);
      return () => document.removeEventListener("mousedown", handler, true);
      // closeAndRestoreFocus intentionally not in deps — it is stable per render
      // and re-running the effect on every render would re-bind a fresh listener
      // on every state change.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchor, onClose]);

    // Close on Escape, restore focus to the trigger. Capture-phase for consistency
    // with Sidebar / RecentFileContextMenu keynav patterns.
    useEffect(() => {
      if (!anchor) return;
      const handler = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeAndRestoreFocus();
        }
      };
      document.addEventListener("keydown", handler, true);
      return () => document.removeEventListener("keydown", handler, true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchor, onClose]);

    // Auto-focus the first focusable element on mount so keyboard users land
    // inside the popover. setTimeout(0) so React commits the children first; it
    // is also jsdom-friendly (rAF does not flush in jsdom).
    useEffect(() => {
      if (!popoverRef.current) return;
      const id = window.setTimeout(() => {
        const root = popoverRef.current;
        if (!root) return;
        const first = root.querySelector<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        first?.focus();
      }, 0);
      return () => window.clearTimeout(id);
    }, []);

    // Tab/Shift+Tab focus trap: keep keyboard focus inside the popover. Capture-
    // phase so we can intercept Tab before the browser moves focus into the page.
    useEffect(() => {
      const handler = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;
        const root = popoverRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute("aria-hidden"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", handler, true);
      return () => document.removeEventListener("keydown", handler, true);
    }, []);

  const suggestedApps = getExternalAppHints(
    extension,
    (category as never) ?? format.category,
    openStrategy ?? "external",
    format.supportLevel,
  );

  const supportDescription = t(`supportLevel${format.supportLevel.replace("+", "plus")}` as never);

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(filePath);
      setCopyFlash("path");
      window.setTimeout(() => setCopyFlash(null), 1500);
    } catch {
      // Older WebContents / sandboxed context may reject — fail silently.
    }
  };

  const handleReveal = () => {
    if (typeof window.electronAPI?.revealInFolder === "function") {
      void window.electronAPI.revealInFolder(filePath);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="status-format-popover"
      role="dialog"
      aria-modal="false"
      aria-label={t("statusPopoverTitle")}
      data-placement="top-end"
    >
      <div className="status-format-popover-arrow" aria-hidden="true" />
      <header className="status-format-popover-head">
        <strong className="status-format-popover-title">{format.name}</strong>
        <span
          className={`status-format-popover-support support-${format.supportLevel.replace("+", "plus")}`}
          aria-label={tf("supportLevelBadge", { level: format.supportLevel })}
        >
          {tf("summarySupportBadge", { level: format.supportLevel })}
        </span>
      </header>
      <p className="status-format-popover-desc">{supportDescription}</p>

      {suggestedApps.length > 0 ? (
        <section className="status-format-popover-section">
          <span className="status-format-popover-section-title">{t("statusPopoverAppsTitle")}</span>
          <ul className="status-format-popover-apps">
            {suggestedApps.map((hint) => {
              const appKey = `app${hint.key.charAt(0).toUpperCase()}${hint.key.slice(1)}`;
              const appName = t(appKey as never);
              return (
                <li key={hint.key} className="status-format-popover-app">
                  <div className="status-format-popover-app-head">
                    <strong>{appName}</strong>
                    <span className="status-format-popover-app-plat">{hint.platforms.join(" \u00b7 ")}</span>
                  </div>
                  <button
                    type="button"
                    className="status-format-popover-app-button"
                    onClick={() => {
                      onOpenInSystem?.();
                      onClose();
                    }}
                  >
                    {tf("routeOpenWithApp", { app: appName })}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="status-format-popover-empty">{t("statusPopoverNoApps")}</p>
      )}

      {riskLevel && (
        <dl className="status-format-popover-meta">
          <div>
            <dt>{t("routeRiskLabel")}</dt>
            <dd>{t(`riskLevel${riskLevel.charAt(0).toUpperCase()}${riskLevel.slice(1)}` as never)}</dd>
          </div>
          {openStrategy && (
            <div>
              <dt>{t("statusPopoverStrategyLabel")}</dt>
              <dd>{t(`openStrategy${openStrategy.charAt(0).toUpperCase()}${openStrategy.slice(1)}` as never)}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="status-format-popover-actions">
        <button
          type="button"
          className={`status-format-popover-action${copyFlash === "path" ? " is-copied" : ""}`}
          onClick={handleCopyPath}
        >
          {copyFlash === "path" ? t("statusPopoverCopied") : t("statusPopoverCopyPath")}
        </button>
        <button type="button" className="status-format-popover-action" onClick={handleReveal}>
          {t("statusPopoverReveal")}
        </button>
        <button
          type="button"
          className="status-format-popover-action status-format-popover-action-primary"
          onClick={() => {
            onOpenInSystem?.();
            onClose();
          }}
        >
          {t("openInSystem")}
        </button>
      </div>

      <button
              type="button"
              className="status-format-popover-close"
              aria-label={t("statusPopoverClose")}
              onClick={closeAndRestoreFocus}
            >
        <span aria-hidden="true">{"\u00d7"}</span>
      </button>
    </div>
  );
}