import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";

interface Props { filePath: string; kind: "audio" | "video"; }

export default function MediaViewer({ filePath, kind }: Props) {
  const { t } = useI18n();
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    setError(null);
    setSource(null);

    window.electronAPI
      .getMediaUrl(filePath)
      .then((url) => {
        if (!disposed) setSource(url);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : t("mediaLoadFailed"));
      });

    return () => {
      disposed = true;
    };
  }, [filePath, t]);

  if (error) {
    return <MediaFallback filePath={filePath} kind={kind} message={error} />;
  }

  const codecHint = kind === "video" ? t("mediaVideoCodecHint") : t("mediaAudioCodecHint");

  return (
    <div className={`media-viewer is-${kind}`}>
      <div className="viewer-header">
        <span className="viewer-label">{kind === "video" ? t("mediaVideoLabel") : t("mediaAudioLabel")}</span>
        <span className="viewer-meta">{codecHint}</span>
      </div>
      <div className="media-stage">
        {!source ? (
          <div className="viewer-busy" role="status"><span className="dwg-loader" />{t("mediaLoading")}</div>
        ) : kind === "video" ? (
          <video
            src={source}
            controls
            preload="metadata"
            playsInline
            onError={() => setError(t("mediaCodecUnsupported"))}
          >
            {t("mediaVideoFallbackBody")}
          </video>
        ) : (
          <div className="audio-deck">
            <div className="audio-disc" aria-hidden="true"><i /></div>
            <div className="audio-bars" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} />)}</div>
            <audio
              src={source}
              controls
              preload="metadata"
              onError={() => setError(t("mediaCodecUnsupported"))}
            >
              {t("mediaAudioFallbackBody")}
            </audio>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaFallback({ filePath, kind, message }: { filePath: string; kind: "audio" | "video"; message: string }) {
  const { t } = useI18n();
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
  return (
    <div
      className="viewer-error"
      role="alert"
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          borderRadius: 20,
          padding: "28px 32px",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(148,163,184,0.28)",
          boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "rgba(37,99,235,0.10)",
              color: "#2563EB",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            {kind === "video" ? t("mediaBadgeVideo") : t("mediaBadgeAudio")}
          </div>
          <div>
            <strong style={{ display: "block", fontSize: 16, color: "#0F172A" }}>{kind === "video" ? t("mediaVideoErrorTitle") : t("mediaAudioErrorTitle")}</strong>
            <span style={{ display: "block", fontSize: 12, color: "#64748B", marginTop: 2 }}>{fileName}</span>
          </div>
        </div>

        <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.7, color: "#334155" }}>{message}</p>
        <p style={{ margin: "0 0 18px", fontSize: 12, lineHeight: 1.7, color: "#64748B" }}>
          {t("mediaCodecExplainer1")}
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn-mario" onClick={() => window.electronAPI.openInSystem(filePath)}>
            {t("openInSystem")}
          </button>
          <span style={{ alignSelf: "center", fontSize: 12, color: "#94A3B8" }}>{t("mediaLocalDisclaimer")}</span>
        </div>
      </div>
    </div>
  );
}
