// Audio codec support probing for OpenMe.
//
// OpenMe's `<audio>`-backed playback relies on whatever codecs Chromium ships
// with. On Windows that means: FLAC, WAV/RIFF, Opus, Vorbis/OGG, MP3, AAC/M4A
// (with `mp4a.*` codec tags), and ALAC inside MP4. It does NOT include: DSD
// (DSF/DFF), APE, WMA, TAK, certain CAF-wrapped AIFF, or 32-bit-float WAV
// beyond a few sample rates.
//
// Instead of relying on a static allow-list that drifts every Chromium bump,
// we probe each track at runtime: spin up a hidden `<audio>` element, point
// it at the resolved `openme-media://` URL and wait for `loadedmetadata` or
// `error`. The probe result is cached so it only fires once per file path.
//
// The reason we don't just defer to Chromium's `error` event on the player's
// main `<audio>` is that we want a *specific* reason string ("DSD over PCM is
// not part of Chromium's bundled FFmpeg") to drive the right external-app
// suggestion, not the generic `mediaCodecUnsupported` toast.

export type AudioProbeStatus = "unprobed" | "probing" | "supported" | "unsupported";

export interface AudioProbeResult {
  status: AudioProbeStatus;
  /** Chromium MediaError code: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED. */
  code?: number;
  /** Human-friendly diagnosis derived from extension + error code. */
  reasonKey?: string;
  /** Extension of the source so the UI can show the user what we tried. */
  extension?: string;
}

const probeCache = new Map<string, AudioProbeResult>();

/** Resets the global probe cache. Test-only helper. */
export function _resetAudioProbeCache(): void {
  probeCache.clear();
}

function normalizePath(filePath: string): string {
  const lastSep = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  const base = lastSep >= 0 ? filePath.slice(lastSep + 1) : filePath;
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? base.toLowerCase() : base.slice(0, dot).toLowerCase() + base.slice(dot).toLowerCase();
}

function extensionOf(filePath: string): string {
  const lower = filePath.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return "";
  // Guard against dotfiles: ".bashrc" -> ".bashrc" but we still want
  // extensionless names to return "".
  return lower.slice(dot);
}

/**
 * Map extension + error code to one of the i18n reason keys.
 * Chromium returns MediaError code 4 (MEDIA_ERR_SRC_NOT_SUPPORTED) for both
 * "format unknown" and "format known but container rejected" — we can't
 * distinguish, so we just blame the extension and keep the message honest.
 */
function deriveReasonKey(ext: string, code?: number): string {
  // Chromium MediaError code 4 (MEDIA_ERR_SRC_NOT_SUPPORTED) is the common
  // case for codecs it can't decode. Code 3 (DECODE) usually means the
  // container parsed but a frame was malformed — we still hand off to the
  // generic fallback because there's nothing actionable for the user.
  void code;
  if (ext === ".dsf" || ext === ".dff") return "mediaUnsupportedReasonDSD";
  if (ext === ".ape") return "mediaUnsupportedReasonApe";
  if (ext === ".wma") return "mediaUnsupportedReasonWma";
  if (ext === ".tak") return "mediaUnsupportedReasonTak";
  if (ext === ".aif" || ext === ".aiff") return "mediaUnsupportedReasonAiff";
  if (ext === ".alac") return "mediaUnsupportedReasonAlacCaf";
  if (ext === ".wv") return "mediaUnsupportedReasonWavPack";
  // Generic fallback covers anything else Chromium rejects (e.g. truncated
  // files, container mismatches).
  return "mediaUnsupportedReasonGeneric";
}

interface ProbeOptions {
  /** Override for the audio factory — defaults to `new Audio()`. Tests inject a stub. */
  createAudio?: () => HTMLAudioElement;
  /** ms before aborting the probe and declaring failure. */
  timeoutMs?: number;
}

/**
 * Probe whether Chromium can decode the source behind `sourceUrl`. Cached.
 *
 * @param filePath  used as the cache key and to look up the extension for
 *                  the reason key. Doesn't have to be a real on-disk path,
 *                  but it normally is — the renderer only calls this with
 *                  the player file path.
 * @param sourceUrl the `openme-media://...` URL returned by the main
 *                  process. May be `null` when the URL couldn't be built;
 *                  we then mark the probe `unsupported` immediately so
 *                  the UI can show the failure card without waiting.
 */
export function probeAudioSupport(
  filePath: string,
  sourceUrl: string | null,
  options: ProbeOptions = {}
): Promise<AudioProbeResult> {
  const key = normalizePath(filePath);
  const cached = probeCache.get(key);
  if (cached) return Promise.resolve(cached);

  if (!sourceUrl) {
    const result: AudioProbeResult = {
      status: "unsupported",
      code: 4,
      reasonKey: deriveReasonKey(extensionOf(filePath)),
      extension: extensionOf(filePath),
    };
    probeCache.set(key, result);
    return Promise.resolve(result);
  }

  const createAudio = options.createAudio ?? ((): HTMLAudioElement => new Audio());
  const audio = createAudio();
  const result: AudioProbeResult = { status: "probing" };
  probeCache.set(key, result);

  return new Promise<AudioProbeResult>((resolveP) => {
    const finalize = (next: AudioProbeResult) => {
      probeCache.set(key, next);
      resolveP(next);
      // Quietly tear down — the element is never attached to the DOM.
      audio.removeAttribute("src");
      audio.load();
    };

    const settled: Partial<AudioProbeResult> = {};
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      settled.status = "supported";
      finalize({ ...result, ...settled });
    });
    audio.addEventListener("error", () => {
      settled.status = "unsupported";
      settled.code = audio.error?.code;
      settled.reasonKey = deriveReasonKey(extensionOf(filePath), settled.code);
      settled.extension = extensionOf(filePath);
      finalize({ ...result, ...settled });
    });
    audio.src = sourceUrl;

    // Hard timeout so a stalled fetch never blocks the UI forever.
    const timeoutMs = options.timeoutMs ?? 4000;
    setTimeout(() => {
      if (probeCache.get(key)?.status === "probing") {
        finalize({
          status: "unsupported",
          code: 4,
          reasonKey: deriveReasonKey(extensionOf(filePath)),
          extension: extensionOf(filePath),
        });
      }
    }, timeoutMs);
  });
}

export const AUDIO_PROBE_EXTS = [
  ".dsf", ".dff", ".ape", ".wma", ".tak", ".aif", ".aiff", ".alac", ".wv",
] as const;

export function isExtensionKnownUnsupported(ext: string): boolean {
  return AUDIO_PROBE_EXTS.includes(ext as typeof AUDIO_PROBE_EXTS[number]);
}
