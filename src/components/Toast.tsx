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
// array; this component is presentational and tells the parent which
// entry to dismiss. We render up to MAX_VISIBLE; if more are queued the
// oldest is auto-dismissed when a new one arrives (handled in App.tsx
// before pushing onto the array — keeps this component dumb).

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
  const { t, tf } = useI18n();
  if (toasts.length === 0) return null;
  const visible = toasts.slice(-MAX_VISIBLE);
  const hiddenCount = toasts.length - visible.length;
  return (
    <div className="app-toast-stack" aria-live="polite" aria-relevant="additions" role="status">
      {visible.map((entry, index) => {
        // Older entries in the visible slice sit higher (lower index → farther from the active edge).
        const stackIndex = visible.length - 1 - index;
        return (
          <div
            key={entry.id}
            className={`app-toast is-${entry.kind}`}
            style={
              {
                ["--stack-index" as string]: stackIndex,
                ["--toast-ttl" as string]: `${entry.ttlMs}ms`,
              } as React.CSSProperties
            }
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
          </div>
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
