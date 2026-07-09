import { useCallback, useEffect, useRef, useState } from "react";
import type { FileTabState } from "../types";
import { getFileFormatByPath } from "../file-registry";
import type { FileCapability, FileFormatDefinition } from "../file-registry";
import { extractMetadata } from "../metadata";
import { buildFileBrief } from "../brief";
import { useI18n } from "../i18n";
import { useToast } from "./useToast";
import { CheckIcon } from "./icons/CheckIcon";
import { CrossIcon } from "./icons/CrossIcon";
import { formatFileSize, formatRelativeTime } from "../utils/format";
import {
  formatBitrate,
  formatBitDepth,
  formatChannels,
  formatDuration,
  formatSampleRate,
  getQualityTier,
  isLosslessExtension,
} from "../utils/audioFormat";
import type { AudioFormatProbe, ElectronAPI, FileHashResult, IpcFailureResult, RevealResult } from "../types/electron-api";

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

type HashState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: FileHashResult }
  | { kind: "error" };

function getApi(): ElectronAPI | null {
  if (typeof window === "undefined") return null;
  const api: ElectronAPI | undefined = (window as { electronAPI?: ElectronAPI | undefined }).electronAPI;
  return api ?? null;
}

function isFailure(value: unknown): value is IpcFailureResult {
  return !!value && typeof value === "object" && (value as { success?: boolean }).success === false;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function FileSummaryPanel({ tab, onOpenInSystem }: FileSummaryPanelProps) {
  const { t, tf, lang } = useI18n();
  const { pushToast } = useToast();
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

  const [hashState, setHashState] = useState<HashState>({ kind: "idle" });
  const [copyFlash, setCopyFlash] = useState<"" | "path" | "hash" | "json">("");
  const copyTimer = useRef<number | null>(null);

  // Audio-format probe for the side panel. We only show the audio section
  // when the file is a recognised audio extension; the IPC is cheap and
  // the panel already lives next to the viewer, so latency is invisible.
  const showAudioSection = tab.category === "audio" || isLosslessExtension(tab.path);
  const [audioProbe, setAudioProbe] = useState<AudioFormatProbe | null>(null);
  useEffect(() => {
    if (!showAudioSection) { setAudioProbe(null); return; }
    let cancelled = false;
    const api = getApi();
    const promise = api?.getAudioFormat?.(tab.path);
    if (!promise || typeof promise.then !== "function") return;
    promise
      .then((result) => {
        if (cancelled) return;
        if (isFailure(result)) { setAudioProbe(null); return; }
        if (result && (result as AudioFormatProbe).ok) setAudioProbe(result as AudioFormatProbe);
      })
      .catch(() => { if (!cancelled) setAudioProbe(null); });
    return () => { cancelled = true; };
  }, [tab.path, showAudioSection]);

  // Kick off the SHA-256 stream-hash as soon as the panel mounts. The IPC
  // handler in main.js streams the file in 1 MiB chunks so even multi-GB
  // inputs stay responsive.
  useEffect(() => {
    let cancelled = false;
    setHashState({ kind: "loading" });
    const api = getApi();
    const promise = api?.getFileHash?.(tab.path);
    if (!promise || typeof promise.then !== "function") {
      setHashState({ kind: "error" });
      return () => { cancelled = true; };
    }
    promise
      .then((result) => {
        if (cancelled) return;
        if (isFailure(result)) setHashState({ kind: "error" });
        else if (result && (result as FileHashResult).ok) setHashState({ kind: "ready", data: result as FileHashResult });
        else setHashState({ kind: "error" });
      })
      .catch(() => { if (!cancelled) setHashState({ kind: "error" }); });
    return () => { cancelled = true; };
  }, [tab.path]);

  // Reset transient copy indicator when the user switches tabs.
  useEffect(() => {
    setCopyFlash("");
    if (copyTimer.current !== null) {
      window.clearTimeout(copyTimer.current);
      copyTimer.current = null;
    }
  }, [tab.path]);

  // Cleanup pending copy timer on unmount.
  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  const flashCopy = useCallback((kind: "path" | "hash" | "json") => {
    setCopyFlash(kind);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => {
      setCopyFlash("");
      copyTimer.current = null;
    }, 1400);
  }, []);

  const handleCopyPath = useCallback(async () => {
    const ok = await copyToClipboard(tab.path);
    if (ok) {
      flashCopy("path");
      pushToast("success", t("summaryPathCopied"));
    }
  }, [tab.path, flashCopy, pushToast, t]);

  const handleCopyHash = useCallback(async () => {
    if (hashState.kind !== "ready") return;
    const ok = await copyToClipboard(hashState.data.hash);
    if (ok) {
      flashCopy("hash");
      pushToast("success", t("summaryHashCopied"));
    }
  }, [hashState, flashCopy, pushToast, t]);

  const handleCopyJson = useCallback(async () => {
    const payload = JSON.stringify({
      path: tab.path,
      name: tab.name,
      size: tab.sourceFile?.size ?? null,
      extension: tab.sourceFile?.extension ?? null,
      modifiedAt: tab.sourceFile?.modified_at ?? null,
      hash: hashState.kind === "ready" ? hashState.data.hash : null,
      computedAt: hashState.kind === "ready" ? hashState.data.computedAt : null,
    }, null, 2);
    const ok = await copyToClipboard(payload);
    if (ok) {
      flashCopy("json");
      pushToast("success", t("summaryCopyAsJsonCopied"));
    }
  }, [tab, hashState, flashCopy, pushToast, t]);

  const handleRevealInFolder = useCallback(async () => {
    const api = getApi();
    const promise = api?.revealInFolder?.(tab.path);
    if (!promise || typeof promise.then !== "function") {
      pushToast("error", t("summaryRevealFailed"));
      return;
    }
    const result = await promise;
    if (isFailure(result) || !(result as RevealResult)?.ok) {
      pushToast("error", t("summaryRevealFailed"));
    }
  }, [tab.path, pushToast, t]);

  const sizeBytes = typeof tab.sourceFile?.size === "number" ? tab.sourceFile.size : null;
  const modifiedAt = tab.sourceFile?.modified_at;
  const modifiedDisplay = modifiedAt ? formatRelativeTime(modifiedAt, lang) : "—";
  const sizeDisplay = sizeBytes === null ? "—" : formatFileSize(sizeBytes, lang);

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

      {showAudioSection && audioProbe && (() => {
        const tier = getQualityTier({
          lossless: audioProbe.lossless,
          sampleRate: audioProbe.sampleRate,
          bitsPerSample: audioProbe.bitsPerSample,
          channels: audioProbe.channels,
        });
        const tierKey = tier === "hi-res" ? "hiRes" : tier === "lossless-cd" ? "cd" : tier === "lossy" ? "lossy" : "lossless";
        return (
          <div className="summary-section audio-summary-section">
            <span className="summary-section-title">{t("summaryAudioSection")}</span>
            <div className="audio-summary-card">
              <div className="audio-summary-head">
                <span className={`ll-badge is-${tier}`}>{t(`losslessTier_${tierKey}`)}</span>
                {audioProbe.container ? <span className="audio-summary-container">{audioProbe.container.toUpperCase()}</span> : null}
              </div>
              <dl className="summary-metadata-list">
                <div className="summary-metadata-row">
                  <dt>{t("losslessCodec")}</dt>
                  <dd>{audioProbe.codec ?? audioProbe.container ?? "—"}</dd>
                </div>
                <div className="summary-metadata-row">
                  <dt>{t("losslessSampleRate")}</dt>
                  <dd>{formatSampleRate(audioProbe.sampleRate)}</dd>
                </div>
                <div className="summary-metadata-row">
                  <dt>{t("losslessBitDepth")}</dt>
                  <dd>{formatBitDepth(audioProbe.bitsPerSample)}</dd>
                </div>
                <div className="summary-metadata-row">
                  <dt>{t("losslessChannels")}</dt>
                  <dd>{formatChannels(audioProbe.channels)}</dd>
                </div>
                <div className="summary-metadata-row">
                  <dt>{t("losslessBitrate")}</dt>
                  <dd>{formatBitrate(audioProbe.bitrate)}</dd>
                </div>
                <div className="summary-metadata-row">
                  <dt>{t("losslessDuration")}</dt>
                  <dd>{formatDuration(audioProbe.durationSec)}</dd>
                </div>
              </dl>
            </div>
          </div>
        );
      })()}

      <div className="summary-section">
        <span className="summary-section-title">{t("summaryMetadataSection")}</span>
        <dl className="summary-metadata-list">
          <div className="summary-metadata-row">
            <dt>{t("summaryPath")}</dt>
            <dd>
              <span className="summary-metadata-path" title={tab.path}>{tab.path}</span>
              <button
                type="button"
                className={`summary-metadata-copy${copyFlash === "path" ? " is-copied" : ""}`}
                onClick={handleCopyPath}
                title={t("summaryPathCopyAria")}
                aria-label={t("summaryPathCopyAria")}
              >
                {copyFlash === "path" ? <CheckIcon size={11} strokeWidth={2} /> : <CopyGlyph />}
              </button>
            </dd>
          </div>
          <div className="summary-metadata-row">
            <dt>{t("summarySize")}</dt>
            <dd>{sizeDisplay}</dd>
          </div>
          <div className="summary-metadata-row">
            <dt>{t("summaryModified")}</dt>
            <dd>{modifiedDisplay}</dd>
          </div>
          <div className="summary-metadata-row">
            <dt>{t("summaryHash")}</dt>
            <dd className="summary-metadata-hash-cell">
              <span className="summary-metadata-hash">
                {hashState.kind === "ready" ? hashState.data.shortHash : t("summaryHashPending")}
              </span>
              <span className="summary-metadata-hash-hint">
                {hashState.kind === "ready" ? t("summaryHashShort") : hashState.kind === "error" ? t("summaryHashFailed") : ""}
              </span>
              <button
                type="button"
                className={`summary-metadata-copy${copyFlash === "hash" ? " is-copied" : ""}`}
                onClick={handleCopyHash}
                disabled={hashState.kind !== "ready"}
                title={hashState.kind === "ready" ? t("summaryHashFull") : t("summaryHashPending")}
                aria-label={t("summaryHashCopyAria")}
              >
                {copyFlash === "hash" ? <CheckIcon size={11} strokeWidth={2} /> : <CopyGlyph />}
              </button>
            </dd>
          </div>
        </dl>
        <div className="summary-metadata-actions">
          <button
            type="button"
            className="summary-metadata-button"
            onClick={handleRevealInFolder}
            title={t("summaryRevealInFolderAria")}
          >
            {t("summaryRevealInFolder")}
          </button>
          <button
            type="button"
            className={`summary-metadata-button${copyFlash === "json" ? " is-copied" : ""}`}
            onClick={handleCopyJson}
          >
            {copyFlash === "json" ? t("summaryCopyAsJsonCopied") : t("summaryCopyAsJson")}
          </button>
        </div>
      </div>

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

      {brief.suggestedApps.length > 0 && (
        <div className="summary-section">
          <span className="summary-section-title">{t("summarySuggestedAppsSection")}</span>
          <p className="summary-suggested-apps-hint">{t("summarySuggestedAppHint")}</p>
          <ul className="summary-suggested-apps" aria-label={t("summarySuggestedAppsSection")}>
            {brief.suggestedApps.map((hint) => {
              const appKey = `app${hint.key.charAt(0).toUpperCase()}${hint.key.slice(1)}`;
              const appName = t(appKey);
              return (
                <li key={hint.key} className="summary-suggested-app">
                  <div className="summary-suggested-app-head">
                    <strong>{appName}</strong>
                    <span className="summary-suggested-app-plat">{hint.platforms.join(" \u00b7 ")}</span>
                  </div>
                  <button
                    type="button"
                    className="summary-suggested-app-button"
                    onClick={onOpenInSystem}
                    aria-label={tf("routeOpenWithApp", { app: appName })}
                  >
                    {tf("routeOpenWithApp", { app: appName })}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="summary-actions">
        <button
          type="button"
          onClick={onOpenInSystem}
          aria-label={brief.suggestedApps.length > 0 ? t("summarySuggestedAppFallbackAria") : undefined}
          title={brief.suggestedApps.length > 0 ? t("summarySuggestedAppFallbackAria") : t("openInSystemLong")}
        >
          {t("openInSystem")}
        </button>
      </div>
    </aside>
  );
}

function CopyGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" />
      <path d="M2 8.5V2.5h6" fill="none" stroke="currentColor" />
    </svg>
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
            <span>{supported ? <CheckIcon size={11} strokeWidth={2} /> : <CrossIcon size={10} strokeWidth={1.75} />}</span>
            <strong>{t(capabilityKeys[capability])}</strong>
          </div>
        );
      })}
    </div>
  );
}
