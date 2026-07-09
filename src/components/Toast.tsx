import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon } from "./icons/CheckIcon";
import { AlertIcon } from "./icons/AlertIcon";
import { useI18n } from "../i18n";

export type ToastKind = "success" | "error";

export interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
  ttlMs: number;
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
  // Remaining milliseconds when the timer is currently NOT running.
  // The pause handler subtracts elapsed time before flipping paused,
  // so the resume effect fires the right interval.
  const remainingRef = useRef<number>(entry.ttlMs);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    if (paused) return;
    startedAtRef.current = performance.now();
    const id = window.setTimeout(() => {
      onDismiss(entry.id);
    }, remainingRef.current);
    return () => window.clearTimeout(id);
  }, [paused, entry.id, onDismiss]);

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
      className={`app-toast is-${entry.kind}${paused ? " is-paused" : ""}`}
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
    >
      <i aria-hidden="true">
        {entry.kind === "success" ? (
          <CheckIcon size={12} strokeWidth={2.25} />
        ) : (
          <AlertIcon size={13} strokeWidth={1.75} />
        )}
      </i>
      <span className="app-toast-message">{entry.message}</span>
      <button
        type="button"
        className="app-toast-close"
        aria-label={t("toastClose")}
        onClick={() => onDismiss(entry.id)}
      >
        ×
      </button>
      <div className="app-toast-progress" aria-hidden="true" />
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
