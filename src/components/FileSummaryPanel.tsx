import type { FileTabState } from "../types";
import { getFileFormatByPath } from "../file-registry";
import type { FileCapability, FileFormatDefinition } from "../file-registry";
import { extractMetadata } from "../metadata";
import { buildFileBrief } from "../brief";
import { useI18n } from "../i18n";

interface FileSummaryPanelProps {
  tab: FileTabState;
  onOpenInSystem: () => void;
}

const capabilityKeys: Record<FileCapability, string> = {
  detect: "capDetect",
  preview: "capPreview",
  edit: "capEdit",
  metadata: "capMetadata",
  thumbnail: "capThumbnail",
  "ai-summary": "capAiSummary",
  "external-open": "capExternal",
};

const coreCapabilities: FileCapability[] = ["detect", "preview", "metadata", "ai-summary", "edit", "external-open"];

export default function FileSummaryPanel({ tab, onOpenInSystem }: FileSummaryPanelProps) {
  const { t, tf } = useI18n();
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

  return (
    <aside className="file-summary-panel" aria-label={t("fileSummaryAria")}>
      <div className="file-summary-header">
        <span className="summary-kicker">{t("fileBriefKicker")}</span>
        <strong title={brief.title}>{brief.title}</strong>
        <p>{brief.subtitle}</p>
      </div>

      {registryFormat && (
        <div className="summary-section registry-section">
          <span className="summary-section-title">{t("registrySection")}</span>
          <div className="registry-card">
            <div className="registry-card-head">
              <strong>{registryFormat.name}</strong>
              <span className={`registry-support-badge support-${brief.supportLevel.replace("+", "plus")}`}>{tf("summarySupportBadge", { level: brief.supportLevel })}</span>
            </div>
            <p>{registryFormat.boundary}</p>
            <dl className="registry-strategy-list">
              <div>
                <dt>{t("summaryViewer")}</dt>
                <dd>{brief.preferredViewer}</dd>
              </div>
              <div>
                <dt>{t("summaryStrategy")}</dt>
                <dd>{brief.openStrategy}</dd>
              </div>
              <div>
                <dt>{t("summaryRisk")}</dt>
                <dd>{brief.riskLevel}</dd>
              </div>
            </dl>
            <CapabilityGrid format={registryFormat} />
          </div>
        </div>
      )}

      <div className="summary-section">
        <span className="summary-section-title">{t("signalsSection")}</span>
        <div className="summary-chip-list">
          {brief.signals.map((signal) => (
            <span key={signal} className="summary-chip">{signal}</span>
          ))}
        </div>
      </div>

      <div className="summary-section">
        <span className="summary-section-title">{t("evidenceSection")}</span>
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
          <span className="summary-section-title">{t("boundarySection")}</span>
          <div className="summary-warning-list">
            {brief.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </div>
      )}

      <div className="summary-section">
        <span className="summary-section-title">{t("nextActionsSection")}</span>
        <ul className="summary-action-list">
          {brief.actions.map((action) => (
            <li key={`${action.label}-${action.reason}`}>
              <strong>{action.label}</strong>
              <span>{action.reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="summary-actions">
        <button type="button" onClick={onOpenInSystem}>{t("openInSystem")}</button>
      </div>
    </aside>
  );
}

function CapabilityGrid({ format }: { format: FileFormatDefinition }) {
  const { t } = useI18n();
  const capabilitySet = new Set(format.capabilities);
  return (
    <div className="capability-grid" aria-label={t("capabilityGridAria")}>
      {coreCapabilities.map((capability) => {
        const supported = capabilitySet.has(capability);
        return (
          <div key={capability} className={`capability-cell is-${supported ? "yes" : "no"}`}>
            <span>{supported ? "✓" : "×"}</span>
            <strong>{t(capabilityKeys[capability])}</strong>
          </div>
        );
      })}
    </div>
  );
}
