import { buildFileBrief } from "../../brief";
import { extractMetadata } from "../../metadata";
import type { FileTabState } from "../../types";
import type { ViewerRoute } from "../../viewer-registry";

interface OpenMeRouteCardProps {
  tab: FileTabState;
  route: ViewerRoute;
  title: string;
  description: string;
}

export default function OpenMeRouteCard({ tab, route, title, description }: OpenMeRouteCardProps) {
  const outcome = tab.openOutcome;
  const metadata = extractMetadata({
    filePath: tab.path,
    fileName: tab.name,
    ...(tab.sourceFile?.extension ? { extension: tab.sourceFile.extension } : {}),
    ...(typeof tab.sourceFile?.size === "number" ? { size: tab.sourceFile.size } : {}),
    ...(tab.sourceFile?.modified_at ? { modifiedAt: tab.sourceFile.modified_at } : {}),
    ...(tab.content ? { textSample: tab.content } : {}),
  });
  const brief = buildFileBrief(metadata);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="unsupported-card">
        <div className="unsupported-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <circle cx="12" cy="15" r="1" />
            <path d="M12 12v1" />
          </svg>
        </div>
        <span className="summary-kicker">OpenMe Direct Open</span>
        <h3>{title}</h3>
        <p className="unsupported-subtitle">{tab.name}</p>
        <p>{outcome?.message ?? description}</p>
        <div className="summary-chip-list" aria-label="OpenMe route">
          <span className="summary-chip">{route.surface}</span>
          <span className="summary-chip">{route.mode}</span>
          <span className="summary-chip">{route.label}</span>
          {outcome && <span className="summary-chip">{outcome.loader}</span>}
          {outcome && <span className="summary-chip">{outcome.status}</span>}
        </div>
        <dl className="registry-strategy-list">
          <div>
            <dt>Surface</dt>
            <dd>{route.surface}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{route.mode}</dd>
          </div>
          <div>
            <dt>Preview</dt>
            <dd>{route.canPreview ? "available" : "card"}</dd>
          </div>
          {outcome && (
            <div>
              <dt>Loader</dt>
              <dd>{outcome.loader}</dd>
            </div>
          )}
          {outcome && (
            <div>
              <dt>Status</dt>
              <dd>{outcome.status}</dd>
            </div>
          )}
        </dl>
        <p>{route.reason}</p>
        <p>{route.boundary}</p>
        <div className="summary-section">
          <span className="summary-section-title">Signals</span>
          <div className="summary-chip-list">
            {brief.signals.slice(0, 8).map((signal) => (
              <span key={signal} className="summary-chip">{signal}</span>
            ))}
          </div>
        </div>
        {brief.warnings.length > 0 && (
          <div className="summary-section">
            <span className="summary-section-title">Boundary</span>
            <div className="summary-warning-list">
              {brief.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          </div>
        )}
        <div className="summary-section">
          <span className="summary-section-title">OpenMe Actions</span>
          <ul className="summary-action-list">
            {brief.actions.map((action) => (
              <li key={`${action.label}-${action.reason}`}>
                <strong>{action.label}</strong>
                <span>{action.reason}</span>
              </li>
            ))}
          </ul>
        </div>
        {route.hasExternalFallback && <button type="button" onClick={() => window.electronAPI.openInSystem(tab.path)}>用系统程序兜底打开</button>}
      </div>
    </div>
  );
}
