import { useRef, useState } from "react";
import type { HonestSupportLevel, FileOpenStrategy, FileRiskLevel } from "../../file-registry";
import { getFileFormatByPath } from "../../file-registry";
import { useI18n } from "../../i18n";
import { useSettings } from "../../settings";
import { SunIcon, MoonIcon } from "../icons/TitleBarIcons";
import StatusBarFormatPopover from "./StatusBarFormatPopover";

interface Props {
  activeTab: {
    name: string;
    path?: string;
    size?: number;
    content?: string;
    isDirty?: boolean;
    isLoading?: boolean;
    riskLevel?: FileRiskLevel;
    openStrategy?: FileOpenStrategy;
  } | null;
  /** Position of the active tab in the tab list (1-based). Used for the "n / total" pill. */
  activePosition?: number;
  /** Total number of open tabs. */
  totalTabs?: number;
  /** Called when the user clicks "Open in system" from the format popover. */
  onOpenInSystem?: () => void;
}

// Line-ending detection runs over up to this many bytes so giant files
// don't stall the StatusBar's render path. 4 KB is more than enough to
// catch a CR before any editor would mask the result.
const LINE_ENDING_SCAN_BYTES = 4096;

function detectLineEnding(content: string | undefined): "lf" | "crlf" | "mixed" | "none" {
  if (content === undefined || content.length === 0) return "none";
  const slice = content.slice(0, LINE_ENDING_SCAN_BYTES);
  let hasCrlf = false;
  let hasLfOnly = false;
  for (let i = 0; i < slice.length; i += 1) {
    const ch = slice.charCodeAt(i);
    if (ch === 13 /* \r */) {
      if (i + 1 < slice.length && slice.charCodeAt(i + 1) === 10 /* \n */) {
        hasCrlf = true;
        i += 1; // skip the \n we just paired with this \r
      } else {
        // Bare CR (classic-Mac line ending). Treat as its own kind — for
        // the indicator we lump it with LF for "needs normalisation" purposes.
        hasLfOnly = true;
      }
    } else if (ch === 10 /* \n */) {
      hasLfOnly = true;
    }
  }
  if (hasCrlf && hasLfOnly) return "mixed";
  if (hasCrlf) return "crlf";
  if (hasLfOnly) return "lf";
  return "none";
}

function statusLineEndingKey(kind: "lf" | "crlf" | "mixed" | "none"): string {
  switch (kind) {
    case "crlf": return "statusLineEndingCRLF";
    case "mixed": return "statusLineEndingMixed";
    case "none": return "statusLineEndingNone";
    default: return "statusLineEndingLF";
  }
}

export default function StatusBar({ activeTab, activePosition, totalTabs, onOpenInSystem }: Props) {
  const { t, tf } = useI18n();
  const { settings, update } = useSettings();
  const lines = activeTab?.content !== undefined ? activeTab.content.split("\n").length : 0;
  const sizeLabel = typeof activeTab?.size === "number" ? formatBytes(activeTab.size, t("unknownSize")) : null;
  const format = activeTab?.path ? getFileFormatByPath(activeTab.path) : undefined;
  const lineEnding = detectLineEnding(activeTab?.content);
  const isBinary = activeTab?.content === null;
  const showTabPosition = typeof activePosition === "number" && typeof totalTabs === "number" && totalTabs > 1;
  const showRiskChip = activeTab?.riskLevel === "high";
  const showStrategyChip = activeTab?.openStrategy === "external" || activeTab?.openStrategy === "restricted";
  const [formatPopoverOpen, setFormatPopoverOpen] = useState(false);
    const [copiedPath, setCopiedPath] = useState(false);
    const supportBadgeRef = useRef<HTMLButtonElement | null>(null);
    const filenameRef = useRef<HTMLButtonElement | null>(null);
    const extensionFromPath = (() => {
      if (!activeTab?.path) return "";
      const lastDot = activeTab.path.lastIndexOf(".");
      const lastSlash = Math.max(activeTab.path.lastIndexOf("/"), activeTab.path.lastIndexOf("\\"));
      if (lastDot < 0 || lastDot < lastSlash) return "";
      return `.${activeTab.path.slice(lastDot + 1).toLowerCase()}`;
    })();

  const strategyLabel = (strategy: FileOpenStrategy): string => {
    if (strategy === "external") return t("openStrategyExternal");
    if (strategy === "restricted") return t("openStrategyRestricted");
    if (strategy === "semantic") return t("openStrategySemantic");
    if (strategy === "text") return t("openStrategyText");
    return t("openStrategyBuiltin");
  };

    const riskLabel = activeTab?.riskLevel === "high"
      ? t("statusRiskHigh")
      : activeTab?.riskLevel === "medium"
        ? t("statusRiskMedium")
        : t("statusRiskLow");

  const cycleTheme = () => {
    update("theme", settings.theme === "dark" ? "light" : "dark");
  };

  const strategyName = showStrategyChip && activeTab?.openStrategy ? strategyLabel(activeTab.openStrategy) : "";

  const handleCopyPath = async () => {
    const path = activeTab?.path;
    if (!path) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(path);
      } else {
        // Fallback for non-secure contexts: temp textarea + execCommand
        const textarea = document.createElement("textarea");
        textarea.value = path;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedPath(true);
      window.setTimeout(() => setCopiedPath(false), 1600);
    } catch {
      // Silently swallow — user can always see the path in the title attribute.
    }
  };

  return (
    <footer className="status-bar">
      {activeTab?.isLoading && (
        <div className="status-progress" role="progressbar" aria-label={t("statusLoadingAria")} />
      )}
      <div className="status-left">
        <span className={activeTab?.isDirty ? "status-dirty" : "status-ready"}>
          <i aria-hidden="true" />
          {activeTab?.isDirty ? t("modified") : t("ready")}
        </span>
        <button
                  ref={filenameRef}
                  type="button"
                  className={`status-file status-filename-button${copiedPath ? " is-copied" : ""}`}
                  title={activeTab?.path ?? t("statusFilenameCopyHint")}
                  aria-label={copiedPath ? t("statusFilenameCopied") : t("statusFilenameCopy")}
                  onClick={handleCopyPath}
                  disabled={!activeTab?.path}
                >
                  {copiedPath ? t("statusFilenameCopied") : (activeTab?.name ?? t("waitingForFile"))}
                </button>
        {!activeTab && (
          <span className="status-idle-hint" aria-label={t("statusIdleHintAria")}>
            {t("statusIdleHint")}
          </span>
        )}
        {format && (
          <SupportBadge
            level={format.supportLevel}
            label={format.name}
            tf={tf}
            buttonRef={supportBadgeRef}
            onClick={() => setFormatPopoverOpen((value) => !value)}
            isActive={formatPopoverOpen}
            activeLabel={t("statusPopoverClose")}
            idleLabel={t("statusFormatAria")}
          />
        )}
        {formatPopoverOpen && format && activeTab?.path && (
          <StatusBarFormatPopover
            anchor={supportBadgeRef.current}
            format={format}
            filePath={activeTab.path}
            extension={extensionFromPath}
            openStrategy={activeTab.openStrategy}
            riskLevel={activeTab.riskLevel}
            category={format.category}
            onClose={() => setFormatPopoverOpen(false)}
            onOpenInSystem={onOpenInSystem}
          />
        )}
        {format && (
          <span
            className="status-format-chip"
            title={tf("statusFormatAria", { name: format.name })}
            aria-label={tf("statusFormatAria", { name: format.name })}
          >
            {tf("statusFormatLabel", { name: format.name })}
          </span>
        )}
        {isBinary && <span className="status-binary-chip">{t("statusBinaryLabel")}</span>}
        {showRiskChip && (
          <span
            className="status-risk-chip is-high"
                    aria-label={tf("statusRiskAria", { level: riskLabel })}
          >
                    {tf("statusRiskChip", { level: riskLabel })}
          </span>
        )}
        {showStrategyChip && activeTab?.openStrategy && (
          <span
            className="status-strategy-chip"
            aria-label={tf("statusStrategyAria", { strategy: strategyName })}
          >
            {tf("statusStrategyChip", { strategy: strategyName })}
          </span>
        )}
        {sizeLabel && <span className="status-meta">{sizeLabel}</span>}
        {lines > 0 && <span className="status-meta">{`${lines.toLocaleString()} ${t("lines")}`}</span>}
      </div>
      <div className="status-right">
        {showTabPosition && (
          <span
            className="status-pill status-tab-position"
            aria-label={tf("statusTabPosition", { position: activePosition!, total: totalTabs! })}
          >
            {tf("statusTabPosition", { position: activePosition!, total: totalTabs! })}
          </span>
        )}
        {activeTab?.isDirty && <span className="status-pill">{t("saveShortcut")}</span>}
        <span className="status-meta-text">{t("localFirst")}</span>
        <span className="status-meta-text status-line-ending">
          <span className="status-meta-subdued">UTF-8</span>
          <span aria-hidden="true">·</span>
          <span title={t("statusLineEndingLabel")}>{t(statusLineEndingKey(lineEnding))}</span>
        </span>
        <button
          type="button"
          className={`status-theme-pill is-${settings.theme}`}
          onClick={cycleTheme}
          aria-label={t("statusThemeToggleAria")}
          title={t("statusThemeToggleAria")}
        >
          {settings.theme === "dark" ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </footer>
  );
}

function SupportBadge({
  level,
  label,
  tf,
  buttonRef,
  onClick,
  isActive,
  activeLabel,
  idleLabel,
}: {
  level: HonestSupportLevel;
  label: string;
  tf: (key: string, params?: Record<string, string | number>) => string;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  onClick?: () => void;
  isActive?: boolean;
  activeLabel?: string;
  idleLabel?: string;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`status-support-badge support-${level.replace("+", "plus")} is-button`}
      title={label}
      aria-label={isActive ? activeLabel : idleLabel}
      aria-expanded={isActive}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      {tf("summarySupportBadge", { level })}
    </button>
  );
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
