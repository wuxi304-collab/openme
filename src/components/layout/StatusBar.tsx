import type { HonestSupportLevel } from "../../file-registry";
import { getFileFormatByPath } from "../../file-registry";
import { useI18n } from "../../i18n";

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
  const { t, tf } = useI18n();
  const lines = activeTab?.content !== undefined ? activeTab.content.split("\n").length : 0;
  const sizeLabel = typeof activeTab?.size === "number" ? formatBytes(activeTab.size, t("unknownSize")) : null;
  const format = activeTab?.path ? getFileFormatByPath(activeTab.path) : undefined;

  return (
    <footer className="status-bar">
      <div className="status-left">
        <span className={activeTab?.isDirty ? "status-dirty" : "status-ready"}>
          <i aria-hidden="true" />
          {activeTab?.isDirty ? t("modified") : t("ready")}
        </span>
        <span className="status-file">{activeTab?.name ?? t("waitingForFile")}</span>
        {format && <SupportBadge level={format.supportLevel} label={format.name} tf={tf} />}
        {sizeLabel && <span className="status-meta">{sizeLabel}</span>}
        {lines > 0 && <span className="status-meta">{`${lines.toLocaleString()} ${t("lines")}`}</span>}
      </div>
      <div className="status-right">
        {activeTab?.isDirty && <span className="status-pill">{t("saveShortcut")}</span>}
        <span>{t("localFirst")}</span>
        <span>UTF-8</span>
        <span className="status-lives" aria-label={t("livesAria")}>× 1</span>
      </div>
    </footer>
  );
}

function SupportBadge({ level, label, tf }: { level: HonestSupportLevel; label: string; tf: (key: string, params?: Record<string, string | number>) => string }) {
  return <span className={`status-support-badge support-${level.replace("+", "plus")}`} title={label}>{tf("summarySupportBadge", { level })}</span>;
}

function formatBytes(bytes: number, unknownLabel: string): string {
  if (!Number.isFinite(bytes) || bytes < 0) return unknownLabel;
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
