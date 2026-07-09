import React from "react";
import { useI18n } from "../i18n";
import { errorRing, installErrorCapture, serializeErrorLog, buildFilename } from "../utils/errorLog";
import { useToast } from "./useToast";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface BoundaryState { error: Error | null; }

interface AppCatchProps {
  fallback: (err: Error) => React.ReactNode;
  onError: (e: Error) => void;
  children: React.ReactNode;
}

/**
 * Class error boundary that does its own fallback rendering (delegated via
 * a render-prop). See ErrorBoundary.tsx for the React 19 reasoning.
 */
class AppErrorCatch extends React.Component<AppCatchProps, BoundaryState> {
  state: BoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("OpenMe app-level boundary caught an error", error);
  }
  componentDidUpdate(_: unknown, prev: BoundaryState) {
    if (!prev.error && this.state.error) this.props.onError(this.state.error);
  }
  render() {
    if (this.state.error) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}

/**
 * App-level safety net. Sits inside I18nProvider/ToastProvider so the
 * fallback UI itself stays localized and can write to the toast stack.
 * Unlike ViewerBoundary, exposes full restart + save-log controls because
 * a crash here likely means the workbench UI is broken too.
 */
export default function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const { t, tf } = useI18n();
  const { pushToast } = useToast();
  const [remountKey, setRemountKey] = React.useState(0);

  const handleError = (e: Error) => {
    installErrorCapture();
    errorRing.record("boundary", "error", e?.message ?? "(no message)");
  };

  const fallback = (e: Error) => {
    const restart = () => setRemountKey((k) => k + 1);
    const reloadApp = () => {
      if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
        window.location.reload();
      } else {
        restart();
      }
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
    const dismiss = () => {
      pushToast("success", t("appBoundaryDismiss"));
      restart();
    };
    return (
      <div className="app-error-boundary" role="alert">
        <div className="app-error-boundary-card">
          <span className="summary-kicker">{t("appBoundaryKicker")}</span>
          <h2>{t("appBoundaryTitle")}</h2>
          <p>{t("appBoundaryBody")}</p>
          <code className="app-error-boundary-message">{e.message}</code>
          <div className="app-error-boundary-actions">
            <button type="button" onClick={restart} className="primary">{t("appBoundaryRetry")}</button>
            <button type="button" onClick={reloadApp} className="ghost">{t("appBoundaryReload")}</button>
            <button type="button" onClick={() => { void saveLog(); }} className="ghost">{t("viewerErrorSaveLog")}</button>
            <button type="button" onClick={dismiss} className="ghost">{t("appBoundaryDismiss")}</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppErrorCatch
      key={remountKey}
      fallback={fallback}
      onError={handleError}
    >
      {children}
    </AppErrorCatch>
  );
}