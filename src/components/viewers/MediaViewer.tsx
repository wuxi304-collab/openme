import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import ViewerError from "../ViewerError";
import { probeAudioSupport, type AudioProbeResult } from "../../utils/audioCodecSupport";
import AudioUnsupported from "./AudioUnsupported";
import "../ViewerError.css";
import "./MediaViewer.css";

interface Props { filePath: string; kind: "audio" | "video"; }

export default function MediaViewer({ filePath, kind }: Props) {
  // Handles the simple <audio>/<video> deck only. Lossless audio formats
  // (FLAC / WAV / AIFF / DSF / DFF) are dispatched to <LosslessAudioPlayer>
  // upstream in ViewerRouter so this component's hook count stays stable
  // across filePath transitions — see PR #144.
  const { t } = useI18n();
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codecProbe, setCodecProbe] = useState<AudioProbeResult | null>(null);
    // User override for the probe — when true, ignore the "unsupported"
    // verdict and let the simple <audio> deck try to play anyway. Mirrors
    // the same escape hatch in LosslessAudioPlayer so both surfaces stay
    // consistent.
    const [probeOverride, setProbeOverride] = useState(false);

    useEffect(() => {
      let disposed = false;
      setError(null);
      setSource(null);
      setCodecProbe(null);
      setProbeOverride(false);

    window.electronAPI
      .getMediaUrl(filePath)
      .then((url) => {
        if (disposed) return;
        setSource(url);
        // Probe codec support for every non-lossless audio path too: even
        // WAV/AIFF routed here (uncommon) or any future exotics. We use the
        // same probe util so behaviour is consistent across players.
        if (kind === "audio") {
          probeAudioSupport(filePath, url)
            .then((result) => { if (!disposed) setCodecProbe(result); })
            .catch(() => { /* ignored — fallback to <audio> deck */ });
        }
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : t("mediaLoadFailed"));
      });

    return () => {
      disposed = true;
    };
  }, [filePath, kind, t]);

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
          ) : codecProbe?.status === "unsupported" && !probeOverride ? (
            <AudioUnsupported
              filePath={filePath}
              probe={codecProbe}
                        onTryAnyway={() => setProbeOverride(true)}
                      />
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
