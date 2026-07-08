import React, { useState, useEffect } from "react";
import { useI18n } from "../i18n";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  onRecover?: () => void;
}

interface ErrorBoundaryState { error: Error | null; }

class ErrorCatch extends React.Component<{ onError: (e: Error) => void; children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { error }; }
  componentDidCatch(error: Error) { console.error("OpenMe viewer boundary caught an error", error); }
  componentDidUpdate(_: unknown, prev: ErrorBoundaryState) {
    if (prev.error !== this.state.error && this.state.error) {
      this.props.onError(this.state.error);
    }
  }
  render() { return this.props.children; }
}

export default function ErrorBoundary({ children, title, onRecover }: ErrorBoundaryProps) {
  const { t } = useI18n();
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => () => setError(null), []);

  if (!error) {
    return <ErrorCatch onError={setError}>{children}</ErrorCatch>;
  }

  return (
    <div className="viewer-error-boundary" role="alert">
      <div className="viewer-error-boundary-card">
        <span className="summary-kicker">{t("viewerErrorKicker")}</span>
        <h3>{title ?? t("viewerErrorTitle")}</h3>
        <p>{t("viewerErrorBody")}</p>
        <code>{error.message}</code>
        <button type="button" onClick={() => { setError(null); onRecover?.(); }}>{t("viewerErrorRetry")}</button>
      </div>
    </div>
  );
}
