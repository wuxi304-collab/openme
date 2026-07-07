import type { FileTabState } from "../types";
import { getFileFormatByPath } from "../file-registry";
import type { FileCapability, FileFormatDefinition } from "../file-registry";
import { extractMetadata } from "../metadata";
import { buildFileBrief } from "../brief";
import { createOpenActionPlan } from "../opening";

interface FileSummaryPanelProps {
  tab: FileTabState;
  onOpenInSystem: () => void;
}

const capabilityLabels: Record<FileCapability, string> = {
  detect: "Detect",
  preview: "Preview",
  edit: "Edit",
  metadata: "Metadata",
  thumbnail: "Thumbnail",
  "ai-summary": "AI Summary",
  "external-open": "External",
};

const coreCapabilities: FileCapability[] = ["detect", "preview", "metadata", "ai-summary", "edit", "external-open"];

export default function FileSummaryPanel({ tab, onOpenInSystem }: FileSummaryPanelProps) {
  const registryFormat = getFileFormatByPath(tab.path);
  const metadata = extractMetadata({
    filePath: tab.path,
    fileName: tab.name,
    extension: tab.sourceFile?.extension,
    size: tab.sourceFile?.size,
    modifiedAt: tab.sourceFile?.modified_at,
    textSample: tab.content ?? undefined,
  });
  const brief = buildFileBrief(metadata);
  const actionPlan = createOpenActionPlan(brief);

  return (
    <aside className="file-summary-panel" aria-label="文件摘要">
      <div className="file-summary-header">
        <span className="summary-kicker">File Brief</span>
        <strong title={brief.title}>{brief.title}</strong>
        <p>{brief.subtitle}</p>
      </div>

      <div className="summary-section">
        <span className="summary-section-title">Action Plan</span>
        <dl className="registry-strategy-list">
          <div>
            <dt>Kind</dt>
            <dd>{actionPlan.kind}</dd>
          </div>
          <div>
            <dt>Viewer</dt>
            <dd>{actionPlan.viewer}</dd>
          </div>
          <div>
            <dt>Check</dt>
            <dd>{actionPlan.requiresConfirmation ? "confirm" : "direct"}</dd>
          </div>
        </dl>
      </div>

      {registryFormat && (
        <div className="summary-section registry-section">
          <span className="summary-section-title">Format Registry</span>
          <div className="registry-card">
            <div className="registry-card-head">
              <strong>{registryFormat.name}</strong>
              <span className={`registry-support-badge support-${brief.supportLevel.replace("+", "plus")}`}>Support {brief.supportLevel}</span>
            </div>
            <p>{registryFormat.boundary}</p>
            <dl className="registry-strategy-list">
              <div>
                <dt>Viewer</dt>
                <dd>{brief.preferredViewer}</dd>
              </div>
              <div>
                <dt>Strategy</dt>
                <dd>{brief.openStrategy}</dd>
              </div>
              <div>
                <dt>Risk</dt>
                <dd>{brief.riskLevel}</dd>
              </div>
            </dl>
            <CapabilityGrid format={registryFormat} />
          </div>
        </div>
      )}

      <div className="summary-section">
        <span className="summary-section-title">Signals</span>
        <div className="summary-chip-list">
          {brief.signals.map((signal) => (
            <span key={signal} className="summary-chip">{signal}</span>
          ))}
        </div>
      </div>

      <div className="summary-section">
        <span className="summary-section-title">Evidence</span>
        <dl className="summary-evidence-list">
          {brief.evidence.map((item) => (
            <div key={`${item.source}-${item.label}-${item.value}`} className={`summary-evidence is-${item.severity ?? "info"}`}>
              <dt>{item.label}</dt>
              <dd title={`${item.source}: ${item.value}`}>{item.value}</dd>
            </div>
          ))}
        </dl>
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
        <span className="summary-section-title">Next Actions</span>
        <ul className="summary-action-list">
          {brief.actions.map((action) => (
            <li key={`${action.label}-${action.reason}`} className={`is-${action.priority}`}>
              <strong>{action.label}</strong>
              <span>{action.reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="summary-actions">
        <button type="button" onClick={onOpenInSystem}>{actionPlan.primaryLabel}</button>
      </div>
    </aside>
  );
}

function CapabilityGrid({ format }: { format: FileFormatDefinition }) {
  const capabilitySet = new Set(format.capabilities);
  return (
    <div className="capability-grid" aria-label="格式能力卡">
      {coreCapabilities.map((capability) => {
        const supported = capabilitySet.has(capability);
        return (
          <div key={capability} className={`capability-cell is-${supported ? "yes" : "no"}`}>
            <span>{supported ? "✓" : "×"}</span>
            <strong>{capabilityLabels[capability]}</strong>
          </div>
        );
      })}
    </div>
  );
}
