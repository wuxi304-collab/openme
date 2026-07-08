import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import ViewerError from "../ViewerError";
import "../ViewerError.css";

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
    <ViewerError
      title={kind === "video" ? t("mediaVideoErrorTitle") : t("mediaAudioErrorTitle")}
      badge={kind === "video" ? t("mediaBadgeVideo") : t("mediaBadgeAudio")}
      caption={fileName}
      message={message}
      action={{ label: t("openInSystem"), onClick: () => window.electronAPI.openInSystem(filePath) }}
    >
      <p style={{ margin: "0 0 12px", fontSize: 12, lineHeight: 1.7, color: "var(--text-muted)" }}>
        {t("mediaCodecExplainer1")}
      </p>
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: "var(--text-muted)" }}>
        {t("mediaLocalDisclaimer")}
      </p>
    </ViewerError>
  );
}
