import type { ReactNode } from "react";

export type ViewerErrorVariant = "fullpage" | "inline";

export interface ViewerErrorAction {
  label: string;
  onClick: () => void;
}

interface Props {
  /** "fullpage" centers a card in the available space (default). Use for
   *  fatal viewer failures where the file cannot be rendered. "inline" is a
   *  compact banner — use for transient action errors (e.g. zip extract
   *  failure, AI plan error). */
  variant?: ViewerErrorVariant;
  /** Headline shown prominently. Localized by the caller via t()/tf(). */
  title: string;
  /** Body copy. Localized. Plain string or pre-formatted ReactNode. */
  message?: ReactNode;
  /** Optional small label rendered above the title (e.g. "VIDEO"). */
  badge?: string;
  /** Optional headline icon (rendered before the badge/title). */
  icon?: ReactNode;
  /** Optional secondary headline line (file name, route id, etc.). */
  caption?: ReactNode;
  /** Optional primary action button. */
  action?: ViewerErrorAction;
    /** Optional secondary action button — rendered alongside the primary one
     *  with a quieter visual treatment. Useful for "try anyway" overrides or
     *  alternate fallbacks (e.g. AudioUnsupported letting the user override
     *  the codec probe verdict). */
    secondaryAction?: ViewerErrorAction & { ariaLabel?: string };
    /** Optional dismiss handler — adds a close button in the top-right. */
    onClose?: () => void;
    /** Localized label for the close button. Required when onClose is set. */
    closeLabel?: string;
    /** Extra content rendered below the message but above the action row. */
    children?: ReactNode;
    /** Optional className passthrough for layout-specific tweaks. */
    className?: string;
  }

/**
 * Shared viewer error state. Centralizes the visual language for "this
 * file cannot be rendered" across PdfViewer, OfficeViewer, ZipViewer,
 * MediaViewer, FontViewer, EpubViewer, DwgViewer, CadViewer, CadAssistant,
 * and CsvViewer.
 *
 * Accessibility:
 *   - role="alert" so screen readers announce the failure immediately
 *   - aria-live="assertive" for fullpage, "polite" for inline banners
 *   - the close button gets a translated label via aria-label
 *
 * Visual:
 *   - fullpage: a centered card with the same elevated-bg/border tokens
 *     used by SettingsDialog/AboutDialog/ConfirmDialog
 *   - inline: a compact banner with a red-tinted background using the
 *     --error theme token, matching the existing cad-ai-error tone
 */
export default function ViewerError({
  variant = "fullpage",
  title,
  message,
  badge,
  icon,
  caption,
  action,
  secondaryAction,
  onClose,
  closeLabel,
  children,
  className,
}: Props) {
  const isInline = variant === "inline";

  const cardClass = isInline ? "viewer-error is-inline" : "viewer-error";

  return (
    <div
      className={[cardClass, className].filter(Boolean).join(" ")}
      role="alert"
      aria-live={isInline ? "polite" : "assertive"}
    >
      <div className="viewer-error-card">
        {onClose && (
          <button
            type="button"
            className="viewer-error-close"
                    aria-label={closeLabel ?? "Close"}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
        <div className="viewer-error-head">
          {icon && <div className="viewer-error-icon" aria-hidden="true">{icon}</div>}
          {badge && <div className="viewer-error-badge" aria-hidden="true">{badge}</div>}
          <div className="viewer-error-titles">
            <strong className="viewer-error-title">{title}</strong>
            {caption && <span className="viewer-error-caption">{caption}</span>}
          </div>
        </div>
        {message && <p className="viewer-error-message">{message}</p>}
        {children}
        {(action || secondaryAction) && (
          <div className="viewer-error-actions">
                    {action && (
                      <button
                        type="button"
                        className="btn-mario"
                        onClick={action.onClick}
                      >
                        {action.label}
                      </button>
                    )}
                    {secondaryAction && (
                      <button
                        type="button"
                        className="btn-mario is-secondary"
                        onClick={secondaryAction.onClick}
                        aria-label={secondaryAction.ariaLabel}
                      >
                        {secondaryAction.label}
                      </button>
                    )}
                  </div>
                )}
      </div>
    </div>
  );
}