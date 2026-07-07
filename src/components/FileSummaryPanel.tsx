import type { FileTabState } from "../types";
import { buildBasicFileSummary } from "../understanding";

interface FileSummaryPanelProps {
  tab: FileTabState;
  onOpenInSystem: () => void;
}

export default function FileSummaryPanel({ tab, onOpenInSystem }: FileSummaryPanelProps) {
  const summary = buildBasicFileSummary({
    filePath: tab.path,
    fileName: tab.name,
    category: tab.category,
    extension: tab.sourceFile?.extension,
    size: tab.sourceFile?.size,
    textSample: tab.content ?? undefined,
  });

  return (
    <aside className="file-summary-panel" aria-label="文件摘要">
      <div className="file-summary-header">
        <span className="summary-kicker">File Summary</span>
        <strong title={summary.title}>{summary.title}</strong>
        <p>{summary.description}</p>
      </div>

      <div className="summary-section">
        <span className="summary-section-title">Signals</span>
        <div className="summary-chip-list">
          {summary.signals.map((signal) => (
            <span key={signal} className="summary-chip">{signal}</span>
          ))}
        </div>
      </div>

      <div className="summary-section">
        <span className="summary-section-title">Evidence</span>
        <dl className="summary-evidence-list">
          {summary.evidence.map((item) => (
            <div key={`${item.label}-${item.value}`} className={`summary-evidence is-${item.severity ?? "info"}`}>
              <dt>{item.label}</dt>
              <dd title={item.value}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {summary.warnings.length > 0 && (
        <div className="summary-section">
          <span className="summary-section-title">Boundary</span>
          <div className="summary-warning-list">
            {summary.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </div>
      )}

      <div className="summary-actions">
        <button type="button" onClick={onOpenInSystem}>用系统程序打开</button>
      </div>
    </aside>
  );
}
