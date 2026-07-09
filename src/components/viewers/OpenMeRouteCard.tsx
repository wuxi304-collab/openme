import { useState } from "react";
import { buildFileBrief } from "../../brief";
import { extractMetadata } from "../../metadata";
import type { FileTabState } from "../../types";
import type { ViewerRoute } from "../../viewer-registry";
import type { FileCategory, FileOpenStrategy } from "../../file-registry/types";
import type { ExternalAppHint } from "../../viewer-registry/externalApps";
import { useI18n } from "../../i18n";
import "./openme-route-card.css";

interface OpenMeRouteCardProps {
  tab: FileTabState;
  route: ViewerRoute;
  title: string;
  description: string;
  /**
   * Optional retry callback. When provided the card surfaces a Retry
   * button so the user can re-attempt a failed or not-yet-rendered
   * open. The card flips into a "Retrying..." busy state while the
   * callback is in flight so the user sees feedback that work is
   * happening. Pass `undefined` to hide the button (e.g. when there
   * is no source file to retry against).
   */
  onRetry?: () => void;
}

const CATEGORY_I18N_KEYS: Record<FileCategory, string> = {
  code: "categoryCode",
  markdown: "categoryMarkdown",
  office: "categoryOffice",
  csv: "categoryCsv",
  pdf: "categoryPdf",
  epub: "categoryEpub",
  image: "categoryImage",
  svg: "categorySvg",
  design: "categoryDesign",
  audio: "categoryAudio",
  video: "categoryVideo",
  cad: "categoryCad",
  dwg: "categoryDwg",
  font: "categoryFont",
  archive: "categoryArchive",
  package: "categoryPackage",
  disk: "categoryDisk",
  json: "categoryJson",
  other: "categoryOther",
};

/**
 * Pair an external-app hint key with a structured reason. The key dictates
 * which i18n entry to look up for the user-visible reason text.
 */
interface AppReasonLink {
  kindKey: string;
  reasonKey: "DeFacto" | "Native" | "OpenSource" | "System" | "Ecosystem";
}

const APP_REASON_LINKS: Record<string, AppReasonLink> = {
  photoshop: { kindKey: "routeFormatKindImage", reasonKey: "DeFacto" },
  illustrator: { kindKey: "routeFormatKindDesign", reasonKey: "DeFacto" },
  indesign: { kindKey: "routeFormatKindDesign", reasonKey: "DeFacto" },
  xd: { kindKey: "routeFormatKindDesign", reasonKey: "DeFacto" },
  figma: { kindKey: "routeFormatKindDesign", reasonKey: "DeFacto" },
  sketch: { kindKey: "routeFormatKindDesign", reasonKey: "DeFacto" },
  coreldraw: { kindKey: "routeFormatKindDesign", reasonKey: "DeFacto" },
  affinityDesigner: { kindKey: "routeFormatKindDesign", reasonKey: "Ecosystem" },
  inkscape: { kindKey: "routeFormatKindDesign", reasonKey: "OpenSource" },
  photopea: { kindKey: "routeFormatKindImage", reasonKey: "OpenSource" },
  autocad: { kindKey: "routeFormatKindCAD", reasonKey: "DeFacto" },
  librecad: { kindKey: "routeFormatKindCAD", reasonKey: "OpenSource" },
  fusion360: { kindKey: "routeFormatKindCAD", reasonKey: "Ecosystem" },
  kicad: { kindKey: "routeFormatKindCAD", reasonKey: "OpenSource" },
  microsoftWord: { kindKey: "routeFormatKindOffice", reasonKey: "DeFacto" },
  microsoftExcel: { kindKey: "routeFormatKindOffice", reasonKey: "DeFacto" },
  microsoftPowerpoint: { kindKey: "routeFormatKindOffice", reasonKey: "DeFacto" },
  wpsOffice: { kindKey: "routeFormatKindOffice", reasonKey: "Ecosystem" },
  libreOffice: { kindKey: "routeFormatKindOffice", reasonKey: "OpenSource" },
  pages: { kindKey: "routeFormatKindOffice", reasonKey: "Native" },
  numbers: { kindKey: "routeFormatKindOffice", reasonKey: "Native" },
  keynote: { kindKey: "routeFormatKindOffice", reasonKey: "Native" },
  vlc: { kindKey: "routeFormatKindVideo", reasonKey: "OpenSource" },
  iina: { kindKey: "routeFormatKindVideo", reasonKey: "Native" },
  foobar2000: { kindKey: "routeFormatKindAudio", reasonKey: "Ecosystem" },
  audacity: { kindKey: "routeFormatKindAudio", reasonKey: "OpenSource" },
  dspeaker: { kindKey: "routeFormatKindAudio", reasonKey: "Ecosystem" },
  calibre: { kindKey: "routeFormatKindEbook", reasonKey: "OpenSource" },
  kindle: { kindKey: "routeFormatKindEbook", reasonKey: "Native" },
  systemViewer: { kindKey: "routeFormatKindImage", reasonKey: "System" },
  fontManager: { kindKey: "routeFormatKindFont", reasonKey: "System" },
  fontForge: { kindKey: "routeFormatKindFont", reasonKey: "OpenSource" },
  peazip: { kindKey: "routeFormatKindArchive", reasonKey: "OpenSource" },
  keka: { kindKey: "routeFormatKindArchive", reasonKey: "Native" },
  theUnarchiver: { kindKey: "routeFormatKindArchive", reasonKey: "Native" },
  bandizip: { kindKey: "routeFormatKindArchive", reasonKey: "Ecosystem" },
  djvulibre: { kindKey: "routeFormatKindEbook", reasonKey: "OpenSource" },
  gis: { kindKey: "routeFormatKindGeneric", reasonKey: "OpenSource" },
};

function strategyReasonKey(mode: ViewerRoute["mode"]): string {
  switch (mode) {
    case "builtin": return "routeReasonBuiltin";
    case "text": return "routeReasonText";
    case "semantic": return "routeReasonSemantic";
    case "safe-card": return "routeReasonSemantic";
    case "restricted-card": return "routeReasonRestricted";
    default: return "routeReasonExternal";
  }
}

function strategyLabelKey(mode: ViewerRoute["mode"]): string {
  switch (mode) {
    case "builtin": return "openStrategyBuiltin";
    case "text": return "openStrategyText";
    case "semantic": return "openStrategySemantic";
    case "safe-card": return "openStrategyExternal";
    case "restricted-card": return "openStrategyRestricted";
    default: return "openStrategyExternal";
  }
}

function supportLevelKey(level: FileFormatLevel): string {
  switch (level) {
    case "A+": return "supportLevelAplus";
    case "A": return "supportLevelA";
    case "B": return "supportLevelB";
    case "C": return "supportLevelC";
    case "D": return "supportLevelD";
    case "E": return "supportLevelE";
    default: return "supportLevelF";
  }
}

function riskLevelKey(level: string): string {
  if (level === "low") return "riskLevelLow";
  if (level === "high") return "riskLevelHigh";
  return "riskLevelMedium";
}

type FileFormatLevel = "A+" | "A" | "B" | "C" | "D" | "E" | "F";

function strategyToOpen(strategy: FileOpenStrategy): ViewerRoute["mode"] {
  switch (strategy) {
    case "builtin": return "builtin";
    case "text": return "text";
    case "semantic": return "semantic";
    case "restricted": return "restricted-card";
    default: return "safe-card";
  }
}

export default function OpenMeRouteCard({ tab, route, title, description, onRetry }: OpenMeRouteCardProps) {
  const { t, tf } = useI18n();
  // Track retry busy state independently from the parent's `tab.isLoading`
  // because the parent drives `isLoading` only at the very start of a
  // retry round. We keep a local flag so the button stays visibly busy
  // (label flips to "Retrying...", aria-busy true) until the user sees
  // the next state — successful render or refreshed error card.
  const [isRetrying, setIsRetrying] = useState(false);
  const handleRetry = () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      onRetry();
    } finally {
      // Release the busy state after a short delay so the user sees the
      // transition even when the parent re-renders the route card in the
      // same React batch. Without this the button flips back instantly
      // and the "Retrying..." copy never has time to register.
      window.setTimeout(() => setIsRetrying(false), 600);
    }
  };
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

  const categoryKey = CATEGORY_I18N_KEYS[brief.category] ?? "categoryOther";
  const categoryLabel = t(categoryKey);
  const supportLevelLabel = t(supportLevelKey(brief.supportLevel as FileFormatLevel));
  const strategyMode = route.mode ?? strategyToOpen(brief.openStrategy);
  const strategyLabelText = t(strategyLabelKey(strategyMode));
  const strategyReasonText = t(strategyReasonKey(strategyMode));
  const supportBadgeText = tf("supportLevelBadge", { level: brief.supportLevel });
  const riskLevelText = t(riskLevelKey(brief.riskLevel));

  const highlightedFacts = brief.evidence
    .filter((item) => Boolean(item.value) && item.value !== "unknown")
    .slice(0, 6);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="openme-route-card">
        <div className="openme-route-card-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <circle cx="12" cy="15" r="1" />
            <path d="M12 12v1" />
          </svg>
        </div>
        <span className="summary-kicker">{t("routeDirectOpen")}</span>

        <div className="openme-route-card-badges">
          <span className="openme-route-card-category-badge">{categoryLabel}</span>
          <span
            className={`registry-support-badge support-${brief.supportLevel.replace("+", "plus")}`}
            title={supportLevelLabel}
          >
            {supportBadgeText}
          </span>
          <span className="openme-route-card-strategy-badge">{strategyLabelText}</span>
        </div>

        <h3 className="openme-route-card-title">{title}</h3>
        <p className="openme-route-card-subtitle">{tab.name}</p>
        <p className="openme-route-card-description">{outcome?.message ?? description}</p>

        <dl className="openme-route-card-grid">
          <div>
            <dt>{t("routeSurface")}</dt>
            <dd>{route.surface}</dd>
          </div>
          <div>
            <dt>{t("routeMode")}</dt>
            <dd>{strategyMode}</dd>
          </div>
          <div>
            <dt>{t("routePreview")}</dt>
            <dd>{route.canPreview ? t("routePreviewAvailable") : t("routePreviewCard")}</dd>
          </div>
          <div>
            <dt>{t("routeRiskLabel")}</dt>
            <dd>{riskLevelText}</dd>
          </div>
          {outcome && (
            <div>
              <dt>{t("routeLoader")}</dt>
              <dd>{outcome.loader}</dd>
            </div>
          )}
          {outcome && (
            <div>
              <dt>{t("routeStatus")}</dt>
              <dd>{outcome.status}</dd>
            </div>
          )}
        </dl>

        <section className="openme-route-card-section" aria-label={t("routeFactsSection")}>
          <span className="summary-section-title">{t("routeFactsSection")}</span>
          {highlightedFacts.length > 0 ? (
            <dl className="openme-route-card-facts">
              {highlightedFacts.map((item) => (
                <div key={`${item.source}-${item.label}-${item.value}`} className={`openme-route-card-fact is-${item.severity ?? "info"}`}>
                  <dt>{item.label}</dt>
                  <dd title={`${item.source}: ${item.value}`}>{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="openme-route-card-empty">—</p>
          )}
        </section>

        <section className="openme-route-card-section" aria-label={t("routeReasonSection")}>
          <span className="summary-section-title">{t("routeReasonSection")}</span>
          <p>{strategyReasonText}</p>
          <p className="openme-route-card-secondary">{route.reason}</p>
        </section>

        <section className="openme-route-card-section" aria-label={t("routeBoundarySection")}>
          <span className="summary-section-title">{t("routeBoundarySection")}</span>
          <p className="openme-route-card-boundary">{route.boundary}</p>
          {brief.warnings.length > 0 && (
            <div className="summary-warning-list">
              {brief.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
        </section>

        <section className="openme-route-card-section" aria-label={t("signalsSection")}>
          <span className="summary-section-title">{t("signalsSection")}</span>
          <div className="summary-chip-list" aria-label={t("routeAria")}>
            {brief.signals.slice(0, 8).map((signal) => (
              <span key={signal} className="summary-chip">{signal}</span>
            ))}
          </div>
        </section>

        <section className="openme-route-card-section" aria-label={t("routeOpenMeActions")}>
          <span className="summary-section-title">{t("routeOpenMeActions")}</span>
          <ul className="summary-action-list">
            {brief.actions.map((action) => (
              <li key={`${action.label}-${action.reason}`}>
                <strong>{action.label}</strong>
                <span>{action.reason}</span>
              </li>
            ))}
          </ul>
        </section>

        {brief.suggestedApps.length > 0 ? (
          <section className="openme-route-card-section openme-route-card-suggested" aria-label={t("routeSuggestedAppsTitle")}>
            <span className="summary-section-title">{t("routeSuggestedAppsTitle")}</span>
            <ul className="openme-route-card-app-list">
              {brief.suggestedApps.map((hint, index) => (
                <li key={hint.key}>
                  <SuggestedAppRow
                    hint={hint}
                    isFallback={index > 0}
                    onOpenInSystem={() => window.electronAPI.openInSystem(tab.path)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="openme-route-card-section" aria-label={t("routeSuggestedAppsTitle")}>
            <span className="summary-section-title">{t("routeSuggestedAppsTitle")}</span>
            <p className="openme-route-card-empty">{t("routeSuggestedAppsEmpty")}</p>
          </section>
        )}

        <div className="openme-route-card-actions">
                  {onRetry && (
            <button
              type="button"
                      className={`openme-route-card-action${route.hasExternalFallback ? "" : " primary"}`}
                      onClick={handleRetry}
                      disabled={isRetrying}
                      aria-busy={isRetrying}
                      aria-label={isRetrying ? t("routeRetrying") : t("routeRetry")}
                    >
                      {isRetrying ? (
                        <span className="openme-route-card-retry-busy" aria-hidden="true">
                          <span className="openme-route-card-retry-dot" />
                          <span className="openme-route-card-retry-dot" />
                          <span className="openme-route-card-retry-dot" />
                        </span>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                      )}
                      <span>{isRetrying ? t("routeRetrying") : t("routeRetry")}</span>
                    </button>
                  )}
                  {route.hasExternalFallback && (
                    <button
                      type="button"
                      className="openme-route-card-action primary"
                      onClick={() => window.electronAPI.openInSystem(tab.path)}
                    >
                      {t("routeSystemFallback")}
                    </button>
                  )}
                </div>
      </div>
    </div>
  );
}

function SuggestedAppRow({
  hint,
  isFallback,
  onOpenInSystem,
}: {
  hint: ExternalAppHint;
  isFallback: boolean;
  onOpenInSystem: () => void;
}) {
  const { t, tf } = useI18n();
  const appKey = `app${hint.key.charAt(0).toUpperCase()}${hint.key.slice(1)}`;
  const appName = t(appKey);
  const link = APP_REASON_LINKS[hint.key];
  const reasonText = link
    ? tf(`appReason${link.reasonKey}`, { kind: t(link.kindKey) })
    : t("appReasonEcosystem");
  const platformsLabel = hint.platforms.join(" · ");
  return (
    <>
      <div className="openme-route-card-app-head">
        <strong>{appName}</strong>
        <span className="openme-route-card-app-plat">{platformsLabel}</span>
      </div>
      <span>{reasonText}</span>
      {isFallback ? (
        <span className="openme-route-card-app-fallback">{tf("routeOpenWithFallback", { app: appName })}</span>
      ) : (
        <button
          type="button"
          className="openme-route-card-app-button"
          onClick={onOpenInSystem}
        >
          {tf("routeOpenWithApp", { app: appName })}
        </button>
      )}
    </>
  );
}
