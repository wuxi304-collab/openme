import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon } from "./icons/CheckIcon";
import { AlertIcon } from "./icons/AlertIcon";
import { InfoIcon } from "./icons/InfoIcon";
import { useI18n } from "../i18n";

export type ToastKind = "success" | "error" | "info";

export interface ToastAction {
  /** Visible button label. */
  label: string;
  /** Where the action sends the user — currently only "external" (open URL). */
  kind: "external";
  /** URL to open. Opened via window.open() so Electron handles the protocol. */
  url: string;
}

export interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
  ttlMs: number;
  /** Optional action button rendered to the right of the message. */
  action?: ToastAction;
}

// Toast stack — replaces the old single-toast pattern. The App holds the
// array; this component owns the dismiss timer so hover-pause can freeze
// the countdown cleanly. We render up to MAX_VISIBLE; if more are
// queued the oldest is auto-dismissed when a new one arrives (handled
// in App.tsx before pushing onto the array — keeps this component
// dumb).

const MAX_VISIBLE = 3;

interface Props {
  toasts: ToastEntry[];
  onDismiss: (id: number) => void;
}

// Fixed index → top offset. Nth-child applies downward since flex-direction
// is column-reverse (newest at the bottom, oldest at the top). Each
// entry sits 14px higher than the next one so the stack reads as
// descending priority with breathing room.
const STACK_STEP = 14;

export function ToastStack({ toasts, onDismiss }: Props) {
  const { tf } = useI18n();
  // Escape dismisses the newest (most recently pushed) toast — matches the
  // close button (×) which is also a direct onDismiss call without a fade.
  // Mounted at document-level capture phase so it beats any in-viewer Escape
  // handler (consistent with Sidebar / Recents / FormatPopover / ViewerError).
  useEffect(() => {
    if (toasts.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      // Newest is the last entry (App pushes to the end).
      const newest = toasts[toasts.length - 1];
      onDismiss(newest.id);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [toasts, onDismiss]);
  if (toasts.length === 0) return null;
  const visible = toasts.slice(-MAX_VISIBLE);
  const hiddenCount = toasts.length - visible.length;
  return (
    <div className="app-toast-stack" aria-live="polite" aria-relevant="additions" role="status">
      {visible.map((entry, index) => {
        // Older entries in the visible slice sit higher (lower index → farther from the active edge).
        const stackIndex = visible.length - 1 - index;
        return (
          <ToastItem
            key={entry.id}
            entry={entry}
            stackIndex={stackIndex}
            onDismiss={onDismiss}
          />
        );
      })}
      {hiddenCount > 0 && (
        <div className="app-toast-overflow" role="presentation">
          {tf("toastLimitHint", { count: hiddenCount })}
        </div>
      )}
    </div>
  );
}

interface ItemProps {
  entry: ToastEntry;
  stackIndex: number;
  onDismiss: (id: number) => void;
}

// One row of the stack. Owns its own timer so hover-pause can freeze
// the countdown cleanly without coordinating with the parent's effect.
// The progress bar is purely CSS-driven off `--toast-ttl`, which keeps
// this component decoupled from animation timing math.
function ToastItem({ entry, stackIndex, onDismiss }: ItemProps) {
  const { t } = useI18n();
  const [paused, setPaused] = useState(false);
  const [exiting, setExiting] = useState(false);
  // Remaining milliseconds when the timer is currently NOT running.
  // The pause handler subtracts elapsed time before flipping paused,
  // so the resume effect fires the right interval.
  const remainingRef = useRef<number>(entry.ttlMs);
  const startedAtRef = useRef<number>(0);
  // Hold the second-stage exit timer so cleanup can cancel it cleanly
  // when paused / unmount races the auto-dismiss fire.
  const exitTimerRef = useRef<number | null>(null);
  // Stable description id for sr-only hint so screen readers announce the
  // hover/focus-pause behaviour on top of the title attribute.
  const hintId = `app-toast-hint-${entry.id}`;

  useEffect(() => {
    if (paused || exiting) return;
    startedAtRef.current = performance.now();
    const id = window.setTimeout(() => {
      // Auto-dismiss path: fade out before unmounting so the toast doesn't
      // just vanish (matches the polished enter animation). User clicks
      // dismiss immediately for tactile feedback — see handleClose action.
      setExiting(true);
      const exitId = window.setTimeout(() => {
        onDismiss(entry.id);
      }, 180);
      exitTimerRef.current = exitId;
    }, remainingRef.current);
    return () => {
      window.clearTimeout(id);
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [paused, exiting, entry.id, onDismiss]);

  const handlePause = useCallback(() => {
    setPaused((prev) => {
      if (prev) return prev;
      const elapsed = performance.now() - startedAtRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      return true;
    });
  }, []);

  const handleResume = useCallback(() => {
    setPaused(false);
  }, []);

  return (
    <div
      className={`app-toast is-${entry.kind}${paused ? " is-paused" : ""}${exiting ? " is-exiting" : ""}`}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onFocusCapture={handlePause}
      onBlurCapture={handleResume}
      style={
        {
          ["--stack-index" as string]: stackIndex,
          ["--toast-ttl" as string]: `${entry.ttlMs}ms`,
        } as React.CSSProperties
      }
      title={t("toastHoverHint")}
      aria-describedby={hintId}
    >
      <i aria-hidden="true">
        {entry.kind === "success" ? (
          <CheckIcon size={12} strokeWidth={2.25} />
              ) : entry.kind === "error" ? (
          <AlertIcon size={13} strokeWidth={1.75} />
              ) : (
                <InfoIcon size={13} strokeWidth={1.75} />
              )}
            </i>
      <span className="app-toast-message">{entry.message}</span>
            {entry.action ? (
              <button
                type="button"
                className="app-toast-action"
                onClick={() => {
                  if (entry.action?.kind === "external") {
                    try {
                      window.open(entry.action.url, "_blank", "noopener,noreferrer");
                    } catch {
                      /* ignore — popup blockers / no shell */
                    }
                  }
                  onDismiss(entry.id);
                }}
              >
                {entry.action.label}
              </button>
            ) : null}
            <button
              type="button"
              className="app-toast-close"
              aria-label={t("toastClose")}
              onClick={() => onDismiss(entry.id)}
            >
              ×
            </button>
      <div className="app-toast-progress" aria-hidden="true" />
      <span id={hintId} className="app-toast-sr-hint">
        {t("toastHoverHint")}
      </span>
    </div>
  );
}

// Helper for callers that need a stable id without importing useRef.
// Cheap and unique within a session — Date.now + counter guards against
// two calls inside the same millisecond.
let __toastCounter = 0;
export function nextToastId(): number {
  __toastCounter += 1;
  return Date.now() * 1000 + (__toastCounter % 1000);
}

export const TOAST_MAX_VISIBLE = MAX_VISIBLE;
export const STACK_OFFSET_PX = STACK_STEP;
