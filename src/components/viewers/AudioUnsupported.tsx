import { useI18n } from "../../i18n";
import ViewerError from "../ViewerError";
import type { AudioProbeResult } from "../../utils/audioCodecSupport";

interface Props {
  filePath: string;
  probe: AudioProbeResult;
  /** Already-loaded metadata so we can surface the format info even when
   *  playback is unavailable. Lets the user *see* what they're dealing
   *  with before they reach for an external player. */
  container?: string | null;
  bitDepth?: number | null;
  sampleRate?: number | null;
  channels?: number | null;
}

/**
 * Audio codec fallback card shown when Chromium rejects the source.
 *
 * We deliberately keep the metadata visible — the user can confirm the
 * format via bit-depth / sample-rate readouts even when we can't play it.
 * The action row offers one-click "open in system" plus, where relevant,
 * a hint pointing at the right external player.
 */
export default function AudioUnsupported({
  filePath,
  probe,
  container,
  bitDepth,
  sampleRate,
  channels,
}: Props) {
  const { t } = useI18n();
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath;

  const formatChips: string[] = [];
  if (container) formatChips.push(container.toUpperCase());
  if (probe.extension && probe.extension !== "." + (container ?? "").toLowerCase()) {
    formatChips.push(probe.extension.replace(/^\./, "").toUpperCase());
  }
  if (bitDepth && bitDepth > 0) formatChips.push(`${bitDepth}-bit`);
  if (sampleRate && sampleRate > 0) formatChips.push(`${(sampleRate / 1000).toFixed(sampleRate % 1000 === 0 ? 0 : 1)} kHz`);
  if (channels && channels > 0) formatChips.push(channels === 2 ? "Stereo" : channels === 1 ? "Mono" : `${channels} ch`);

  const reason = probe.reasonKey ? t(probe.reasonKey) : t("mediaUnsupportedReasonGeneric");
  const suggestions = t("mediaUnsupportedSuggestions");
  const openInSystem = () => {
    window.electronAPI.openInSystem(filePath);
  };

  return (
    <div className="audio-unsupported">
      <ViewerError
        title={t("mediaUnsupportedTitle")}
        badge={t("losslessBadgeAudio")}
        caption={fileName}
        message={reason}
        action={{ label: t("mediaUnsupportedActionSystem"), onClick: openInSystem }}
      >
        <div className="audio-unsupported-meta" role="group" aria-label={t("audioUnsupportedMetaAria")}>
          {formatChips.map((chip) => (
            <span key={chip} className="audio-unsupported-chip">{chip}</span>
          ))}
        </div>
        <p className="audio-unsupported-suggestions">{suggestions}</p>
      </ViewerError>
    </div>
  );
}
