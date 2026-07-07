import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  onRecover?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("OpenMe viewer boundary caught an error", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onRecover?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="viewer-error-boundary" role="alert">
        <div className="viewer-error-boundary-card">
          <span className="summary-kicker">Viewer Boundary</span>
          <h3>{this.props.title ?? "预览器出现错误"}</h3>
          <p>当前 Viewer 已被隔离，OpenMe 主工作台仍可继续使用。</p>
          <code>{this.state.error.message}</code>
          <button type="button" onClick={this.reset}>重试当前预览</button>
        </div>
      </div>
    );
  }
}
