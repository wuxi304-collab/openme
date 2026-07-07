import type { FileTabState } from "../types";
import { buildBasicFileSummary } from "../understanding";
import type { SupportLevel } from "../understanding";

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
  const actions = getRecommendedActions(summary.supportLevel, tab.category);

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

      <div className="summary-section">
        <span className="summary-section-title">Next Actions</span>
        <ul className="summary-action-list">
          {actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </div>

      <div className="summary-actions">
        <button type="button" onClick={onOpenInSystem}>用系统程序打开</button>
      </div>
    </aside>
  );
}

function getRecommendedActions(supportLevel: SupportLevel, category: FileTabState["category"]): string[] {
  if (category === "design") return ["确认源软件：Photoshop、Illustrator、Sketch、Figma 或 Affinity。", "用系统程序打开，不在 OpenMe 内承诺高保真渲染。", "后续可接入只读元数据提取。"];
  if (category === "package") return ["不执行安装器。", "后续可提取包名、版本、签名、权限等只读元数据。", "需要安装时交给系统或可信工具。"];
  if (category === "disk") return ["不自动挂载镜像。", "后续可提取镜像类型、体积和分区摘要。", "需要挂载时交给系统或虚拟化工具。"];
  if (category === "dwg") return ["先查看图层、块、实体和文字摘要。", "生产签审使用原生 CAD 软件。", "不要直接修改原始图纸。"];
  if (category === "audio" || category === "video") return ["如果内置播放失败，优先使用系统播放器。", "不要把容器识别等同于编码器支持。"];
  if (supportLevel === "external-open") return ["OpenMe 仅识别并路由该格式。", "使用系统默认程序打开。"];
  if (supportLevel === "semantic-inspection") return ["查看文件边界和风险提示。", "需要完整预览时使用原生软件。"];
  return ["查看当前预览结果。", "需要编辑或专业处理时交给原生软件。"];
}
