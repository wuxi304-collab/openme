import React from "react";
import { useI18n } from "../i18n";
import { errorRing, installErrorCapture, serializeErrorLog, buildFilename } from "../utils/errorLog";
import { useToast } from "./useToast";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  /**
   * Show the extra "save error log" control. The app-level boundary exposes
   * this; per-viewer boundaries typically don't.
   */
  showSaveLog?: boolean;
  /**
   * Called after the user clicks "retry" so callers can perform cleanup
   * (e.g. clear local tab state) before remounting the children.
   */
  onRecover?: () => void;
}

interface ErrorBoundaryState { error: Error | null; }

interface CatchProps {
  fallback: (err: Error) => React.ReactNode;
  onError: (e: Error) => void;
  children: React.ReactNode;
}

/**
 * Class error boundary. The class itself does the fallback rendering using
 * state.error set by getDerivedStateFromError; a callback-only pattern
 * (where the parent's state holds the error) does NOT work in React 19 —
 * the error propagates up because the boundary's render still tries to
 * mount the throwing children.
 */
class ErrorCatch extends React.Component<CatchProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("OpenMe viewer boundary caught an error", error);
  }
  componentDidUpdate(_: unknown, prev: ErrorBoundaryState) {
    if (!prev.error && this.state.error) this.props.onError(this.state.error);
  }
  render() {
    if (this.state.error) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}

export default function ErrorBoundary({ children, title, showSaveLog, onRecover }: ErrorBoundaryProps) {
  const { t, tf } = useI18n();
  const { pushToast } = useToast();
  // remountKey bumps each retry so children remount from scratch even if
  // React re-uses the same fiber. Critical for viewers that cache state in
  // module scope (PDF.js, Three.js scene, etc).
  const [remountKey, setRemountKey] = React.useState(0);

  const handleError = (e: Error) => {
    installErrorCapture();
    errorRing.record("boundary", "error", e?.message ?? "(no message)");
  };

  const fallback = (e: Error) => {
    const retry = () => {
      setRemountKey((k) => k + 1);
      onRecover?.();
    };
    const saveLog = async () => {
      try {
        const payload = serializeErrorLog(e);
        const res = await window.electronAPI.saveErrorLog(payload, buildFilename(e));
        if (!res || (res as { ok?: boolean }).ok !== true) {
          pushToast("error", t("errorLogSaveFailed"));
          return;
        }
        const ok = res as { ok: true; path: string };
        pushToast("success", tf("errorLogSaveSuccess", { path: ok.path }));
      } catch {
        pushToast("error", t("errorLogSaveFailed"));
      }
    };
    return (
      <div className="viewer-error-boundary" role="alert">
        <div className="viewer-error-boundary-card">
          <span className="summary-kicker">{t("viewerErrorKicker")}</span>
          <h3>{title ?? t("viewerErrorTitle")}</h3>
          <p>{t("viewerErrorBody")}</p>
          <code>{e.message}</code>
          <div className="viewer-error-boundary-actions">
            <button type="button" onClick={retry}>{t("viewerErrorRetry")}</button>
            {showSaveLog ? (
              <button type="button" className="ghost" onClick={() => { void saveLog(); }}>
                {t("viewerErrorSaveLog")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorCatch
      key={remountKey}
      fallback={fallback}
      onError={handleError}
    >
      {children}
    </ErrorCatch>
  );
}
