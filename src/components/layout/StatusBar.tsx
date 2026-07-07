import type { HonestSupportLevel } from "../../file-registry";
import { getFileFormatByPath } from "../../file-registry";

interface Props {
  activeTab: {
    name: string;
    path?: string;
    size?: number;
    content?: string;
    isDirty?: boolean;
  } | null;
}

export default function StatusBar({ activeTab }: Props) {
  const lines = activeTab?.content !== undefined ? activeTab.content.split("\n").length : 0;
  const sizeLabel = typeof activeTab?.size === "number" ? formatBytes(activeTab.size) : null;
  const format = activeTab?.path ? getFileFormatByPath(activeTab.path) : undefined;

  return (
    <footer className="status-bar">
      <div className="status-left">
        <span className={activeTab?.isDirty ? "status-dirty" : "status-ready"}>
          <i aria-hidden="true" />
          {activeTab?.isDirty ? "已修改" : "READY"}
        </span>
        <span className="status-file">{activeTab?.name ?? "等待打开文件"}</span>
        {format && <SupportBadge level={format.supportLevel} label={format.name} />}
        {sizeLabel && <span className="status-meta">{sizeLabel}</span>}
        {lines > 0 && <span className="status-meta">{lines.toLocaleString()} 行</span>}
      </div>
      <div className="status-right">
        {activeTab?.isDirty && <span className="status-pill">Ctrl S 保存</span>}
        <span>本地优先</span>
        <span>UTF-8</span>
        <span className="status-lives" aria-label="本地处理">× 1</span>
      </div>
    </footer>
  );
}

function SupportBadge({ level, label }: { level: HonestSupportLevel; label: string }) {
  return <span className={`status-support-badge support-${level.replace("+", "plus")}`} title={label}>Support {level}</span>;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "未知大小";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}
