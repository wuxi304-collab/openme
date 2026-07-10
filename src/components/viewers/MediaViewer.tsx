import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { isLosslessExtension } from "../../utils/audioFormat";
import ViewerError from "../ViewerError";
import "../ViewerError.css";
import LosslessAudioPlayer from "./LosslessAudioPlayer";
import "./MediaViewer.css";

interface Props { filePath: string; kind: "audio" | "video"; }

export default function MediaViewer({ filePath, kind }: Props) {
  // High-fidelity formats get their own dedicated player with cover art,
  // metadata card, AB loop and queue. Everything else falls through to
  // the original <audio>/<video> deck. The early return is BEFORE any
  // hooks so the hook count stays stable across filePath transitions —
  // React requires that the same component call the same hooks in the
  // same order on every render, and a hook set that depends on the
  // extension would otherwise throw "Rendered fewer hooks than expected".
  if (kind === "audio" && isLosslessExtension(filePath)) {
    return <LosslessAudioPlayer filePath={filePath} />;
  }

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
    const fileName = filePath.split(/[\\/]/).pop() ?? filePath;

    return (
      <div className={`media-viewer is-${kind}`}>
        <div className="viewer-header" role="toolbar" aria-label={kind === "video" ? t("mediaVideoToolbarAria") : t("mediaAudioToolbarAria")}>
          <span className="viewer-label">{kind === "video" ? t("mediaVideoLabel") : t("mediaAudioLabel")}</span>
          <span className="media-filename-chip" title={fileName}>{fileName}</span>
          <span className="viewer-meta">{codecHint}</span>
        </div>
        <div
          className="media-stage"
          aria-busy={!source}
          aria-label={kind === "video" ? t("mediaVideoStageAria") : t("mediaAudioStageAria")}
        >
          {!source ? (
            <div className="viewer-busy" role="status"><span className="dwg-loader" />{t("mediaLoading")}</div>
          ) : kind === "video" ? (
            <video
              className="media-video-element"
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
      <p className="media-fallback-explain">{t("mediaCodecExplainer1")}</p>
            <p className="media-fallback-disclaimer">{t("mediaLocalDisclaimer")}</p>
    </ViewerError>
  );
}
