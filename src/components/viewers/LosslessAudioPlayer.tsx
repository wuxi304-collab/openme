// LosslessAudioPlayer — the dedicated high-fidelity audio player for
// FLAC / WAV / AIFF / DSF / DFF. Renders embedded cover art, full tag
// metadata, a quality badge (Hi-Res / Lossless / Lossy / Surround), a
// progress bar with current / remaining time, an A-B loop, full keyboard
// control and a per-folder playback queue.
//
// Falls back gracefully to the simpler MediaViewer's <audio> deck when
// metadata can't be read (e.g. malformed file) — the user can still
// play the file even if we can't badge it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import type { AudioMetadataResult, ListAudioFolderResult } from "../../types/electron-api";
import {
  formatBitrate,
  formatBitDepth,
  formatChannels,
  formatDuration,
  formatRemaining,
  formatSampleRate,
  getQualityTier,
  isLosslessExtension,
  trackDisplayName,
  type QualityTier,
} from "../../utils/audioFormat";
import ViewerError from "../ViewerError";
import "../ViewerError.css";
import "./LosslessAudioPlayer.css";

interface Props {
  filePath: string;
}

interface QueueItem {
  path: string;
  name: string;
  /** Populated lazily by getAudioFormat when the item becomes current. */
  durationSec: number | null;
}

interface AbLoop {
  a: number;
  b: number;
}

const VOLUME_KEY = "openme.audio.volume.v1";
const QUEUE_KEY = "openme.audio.queue.v1";

export default function LosslessAudioPlayer({ filePath }: Props) {
  const { t, tf } = useI18n();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [meta, setMeta] = useState<AudioMetadataResult | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transport state.
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(VOLUME_KEY);
      if (raw == null) return 0.85;
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.85;
    } catch { return 0.85; }
  });

  // Queue state. We restore the last folder + tracks so a reload keeps
  // the listening session alive across app restarts; the current track
  // itself isn't persisted (the user can re-open it).
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { folder?: string; items?: QueueItem[] };
      return Array.isArray(parsed.items) ? parsed.items : [];
    } catch { return []; }
  });
  const [queueFolder, setQueueFolder] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { folder?: string };
      return typeof parsed.folder === "string" ? parsed.folder : null;
    } catch { return null; }
  });
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [abLoop, setAbLoop] = useState<AbLoop | null>(null);
  const [queueOpen, setQueueOpen] = useState(true);

  // Persist volume + queue on change.
  useEffect(() => {
    try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* ignore */ }
  }, [volume]);
  useEffect(() => {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify({ folder: queueFolder, items: queue })); } catch { /* ignore */ }
  }, [queue, queueFolder]);

  // Sync audio element volume with state.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Load metadata + media URL on filePath change.
  useEffect(() => {
    let disposed = false;
    setError(null);
    setMeta(null);
    setSource(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(null);
    setAbLoop(null);

    // 1) read tags + cover
    window.electronAPI.getAudioMetadata(filePath)
      .then((result) => {
        if (disposed) return;
        if ("ok" in result && result.ok) {
          setMeta(result);
          if (result.format.durationSec != null) setDuration(result.format.durationSec);
        } else {
          // IpcFailure — fall through; the <audio> element can still play.
          setMeta(null);
        }
      })
      .catch((reason) => {
        if (disposed) return;
        // Soft-fail: we still want the user to be able to play the file.
        setMeta(null);
        console.warn("getAudioMetadata failed:", reason);
      });

    // 2) resolve a play URL
    window.electronAPI.getMediaUrl(filePath)
      .then((url) => { if (!disposed) setSource(url); })
      .catch((reason) => { if (!disposed) setError(reason instanceof Error ? reason.message : t("mediaLoadFailed")); });

    // 3) ensure the current path is in the queue so prev/next make sense.
    setQueue((prev) => {
      const idx = prev.findIndex((q) => q.path === filePath);
      if (idx >= 0) { setCurrentIndex(idx); return prev; }
      const fallbackName = trackDisplayName(filePath);
      const item: QueueItem = { path: filePath, name: fallbackName, durationSec: null };
      setCurrentIndex(0);
      return [item, ...prev];
    });

    return () => { disposed = true; };
  }, [filePath, t]);

  // Wire HTMLAudioElement events to React state.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => { if (Number.isFinite(el.duration)) setDuration(el.duration); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => { handleAdvance("end"); };
    const onErr = () => setError(t("mediaCodecUnsupported"));
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("durationchange", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnd);
    el.addEventListener("error", onErr);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("durationchange", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("error", onErr);
    };
    // handleAdvance is stable because queue/currentIndex are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // A-B loop enforcement: when currentTime passes b, jump back to a.
  useEffect(() => {
    if (!abLoop) return;
    if (currentTime >= abLoop.b && abLoop.b > abLoop.a) {
      const el = audioRef.current;
      if (el) el.currentTime = abLoop.a;
    }
  }, [currentTime, abLoop]);

  const play = useCallback(() => { audioRef.current?.play().catch(() => undefined); }, []);
  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => undefined);
    else el.pause();
  }, []);
  const seek = useCallback((time: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(time, el.duration || time));
  }, []);
  const seekBy = useCallback((delta: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min((el.currentTime || 0) + delta, el.duration || Infinity));
  }, []);

  const playIndex = useCallback((index: number) => {
    const item = queue[index];
    if (!item) return;
    // We can't actually swap filePath from inside this component — but
    // we CAN preload the next track's audio URL and ask the App to
    // open the new file. Here we just signal the desired track.
    // The actual swap happens in App.openFileInTab via the player
    // dispatching a custom DOM event the App listens for.
    const ev = new CustomEvent("openme:audio-queue-open", { detail: { path: item.path } });
    window.dispatchEvent(ev);
    setCurrentIndex(index);
  }, [queue]);

  const handleAdvance = useCallback((mode: "next" | "prev" | "end") => {
    if (queue.length === 0) return;
    let next = currentIndex;
    if (mode === "end" && repeatMode === "one") { seek(0); play(); return; }
    if (mode === "end" && repeatMode === "off" && currentIndex === queue.length - 1) { setPlaying(false); return; }
    if (shuffle && (mode === "next" || mode === "end")) {
      if (queue.length === 1) { seek(0); play(); return; }
      do { next = Math.floor(Math.random() * queue.length); } while (next === currentIndex);
    } else {
      const dir = mode === "prev" ? -1 : 1;
      next = currentIndex + dir;
      if (next >= queue.length) {
        if (repeatMode === "all") next = 0;
        else return;
      }
      if (next < 0) next = queue.length - 1;
    }
    playIndex(next);
  }, [queue, currentIndex, repeatMode, shuffle, seek, play, playIndex]);

  // Keyboard shortcuts. Only active when the player root has focus or
  // contains the focused element, so it doesn't fight the global Ctrl+O
  // / Ctrl+S handlers in App.tsx.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const handler = (e: KeyboardEvent) => {
      if (!root.contains(document.activeElement)) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); return; }
      if (e.code === "ArrowLeft")  { e.preventDefault(); seekBy(-5); return; }
      if (e.code === "ArrowRight") { e.preventDefault(); seekBy(+5); return; }
      if (e.key === "a" || e.key === "A") { e.preventDefault(); setAbLoopMark("a"); return; }
      if (e.key === "b" || e.key === "B") { e.preventDefault(); setAbLoopMark("b"); return; }
      if (e.key === "m" || e.key === "M") { e.preventDefault(); setMuted((m) => !m); return; }
    };
    root.addEventListener("keydown", handler);
    return () => root.removeEventListener("keydown", handler);
  }, [togglePlay, seekBy]);

  const setAbLoopMark = useCallback((point: "a" | "b") => {
    setAbLoop((current) => {
      const t = audioRef.current?.currentTime ?? 0;
      if (point === "a") return { a: t, b: current ? Math.max(t + 1, current.b) : t + 30 };
      // point === "b"
      if (!current) return { a: 0, b: t };
      const a = Math.min(current.a, t);
      const b = Math.max(current.a + 0.5, t);
      return { a, b };
    });
  }, []);

  const clearAbLoop = useCallback(() => setAbLoop(null), []);

  const importFolder = useCallback(async (folderPath: string) => {
    const result = await window.electronAPI.listAudioInFolder(folderPath, { recursive: true, limit: 500 });
    if (!("ok" in result) || !result.ok) return;
    const list = (result as ListAudioFolderResult).files.map((f) => ({ path: f.path, name: f.name, durationSec: null }));
    if (list.length === 0) return;
    setQueueFolder((result as ListAudioFolderResult).folder);
    setQueue(list);
    setCurrentIndex(0);
  }, []);

  const exportTrackToSystem = useCallback(() => {
    window.electronAPI.openInSystem(filePath);
  }, [filePath]);

  // Build quality badge class. The tier is just the variant; the
  // numeric summary comes from individual formatters.
  const tier: QualityTier = useMemo(() => getQualityTier(meta?.format), [meta]);
  const tierClass = `ll-badge is-${tier}`;
  const tierLabel = t(`losslessTier_${tier === "hi-res" ? "hiRes" : tier === "lossless-cd" ? "cd" : tier === "lossy" ? "lossy" : "lossless"}`);
  const isSurround = (meta?.format.channels ?? 0) > 2;
  const container = meta?.format.container ?? "—";
  const lossless = isLosslessExtension(filePath);

  if (error) {
    return (
      <ViewerError
        title={t("mediaAudioErrorTitle")}
        badge={t("mediaBadgeAudio")}
        caption={trackDisplayName(filePath, meta?.tag.title)}
        message={error}
        action={{ label: t("openInSystem"), onClick: exportTrackToSystem }}
      />
    );
  }

  const totalDuration = duration ?? meta?.format.durationSec ?? null;
  const progress = totalDuration && totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;
  const abProgress = abLoop && totalDuration && totalDuration > 0
    ? { leftPct: (abLoop.a / totalDuration) * 100, rightPct: (abLoop.b / totalDuration) * 100 }
    : null;

  const cover = meta?.cover?.data ?? null;

  return (
    <div
      ref={rootRef}
      className={`lossless-player is-${tier}${playing ? " is-playing" : ""}${isSurround ? " is-surround" : ""}`}
      tabIndex={-1}
      role="region"
      aria-label={t("losslessPlayerLabel")}
    >
      <header className="ll-header">
        <div className="ll-header-left">
          <span className="ll-kind">{t("mediaAudioLabel")}</span>
          <span className="ll-filename" title={filePath}>{trackDisplayName(filePath, meta?.tag.title)}</span>
        </div>
        <div className="ll-header-right">
          <span className={tierClass} title={tierLabel}>{tierLabel}</span>
          {isSurround ? <span className="ll-badge is-surround">{formatChannels(meta?.format.channels ?? null)}</span> : null}
        </div>
      </header>

      <div className="ll-stage">
        <div className={`ll-cover${cover ? "" : " is-fallback"}${playing ? " is-spinning" : ""}`} aria-hidden="true">
          {cover
            ? <img src={cover} alt="" className="ll-cover-img" />
            : <div className="ll-cover-disc"><i /></div>}
        </div>

        <div className="ll-meta">
          <h2 className="ll-title">{meta?.tag.title || trackDisplayName(filePath)}</h2>
          <p className="ll-artist">
            {meta?.tag.artist || t("losslessUnknownArtist")}
            {meta?.tag.albumArtist && meta?.tag.albumArtist !== meta?.tag.artist ? <> · <span className="ll-album-artist">{meta.tag.albumArtist}</span></> : null}
          </p>
          <p className="ll-album">
            {meta?.tag.album || t("losslessUnknownAlbum")}
            {meta?.tag.year ? <span className="ll-year"> · {meta.tag.year}</span> : null}
            {meta?.tag.track ? <span className="ll-track"> · {meta.tag.trackTotal && meta.tag.trackTotal > 0 ? tf("losslessTrackNumberOf", { n: meta.tag.track, total: meta.tag.trackTotal }) : tf("losslessTrackNumber", { n: meta.tag.track })}</span> : null}
          </p>
          {meta?.tag.genre ? <p className="ll-genre">{meta.tag.genre}</p> : null}
        </div>

        <div className="ll-format-grid" aria-label={t("losslessFormatLabel")}>
          <div className="ll-cell"><span className="ll-cell-k">{t("losslessCodec")}</span><span className="ll-cell-v">{meta?.format.codec ?? container}</span></div>
          <div className="ll-cell"><span className="ll-cell-k">{t("losslessSampleRate")}</span><span className="ll-cell-v">{formatSampleRate(meta?.format.sampleRate ?? null)}</span></div>
          <div className="ll-cell"><span className="ll-cell-k">{t("losslessBitDepth")}</span><span className="ll-cell-v">{formatBitDepth(meta?.format.bitsPerSample ?? null)}</span></div>
          <div className="ll-cell"><span className="ll-cell-k">{t("losslessChannels")}</span><span className="ll-cell-v">{formatChannels(meta?.format.channels ?? null)}</span></div>
          <div className="ll-cell"><span className="ll-cell-k">{t("losslessBitrate")}</span><span className="ll-cell-v">{formatBitrate(meta?.format.bitrate ?? null)}</span></div>
          <div className="ll-cell"><span className="ll-cell-k">{t("losslessDuration")}</span><span className="ll-cell-v">{formatDuration(totalDuration)}</span></div>
        </div>

        <div className="ll-progress">
          <div className="ll-times">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatRemaining(currentTime, totalDuration)}</span>
          </div>
          <div
            className="ll-bar"
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={totalDuration ?? 0}
            aria-valuenow={currentTime}
            aria-valuetext={tf("losslessProgressAria", { current: formatDuration(currentTime), total: formatDuration(totalDuration) })}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              if (totalDuration) seek(ratio * totalDuration);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft")  { e.preventDefault(); seekBy(-5); }
              if (e.key === "ArrowRight") { e.preventDefault(); seekBy(+5); }
              if (e.key === "Home")       { e.preventDefault(); seek(0); }
              if (e.key === "End")        { e.preventDefault(); if (totalDuration) seek(totalDuration); }
            }}
          >
            <div className="ll-bar-track" />
            {abProgress ? (
              <>
                <div className="ll-bar-ab" style={{ left: `${abProgress.leftPct}%`, width: `${Math.max(0, abProgress.rightPct - abProgress.leftPct)}%` }} />
                <div className="ll-bar-ab-tick" style={{ left: `${abProgress.leftPct}%` }} aria-label={t("losslessAbPointA")} />
                <div className="ll-bar-ab-tick" style={{ left: `${abProgress.rightPct}%` }} aria-label={t("losslessAbPointB")} />
              </>
            ) : null}
            <div className="ll-bar-fill" style={{ width: `${progress}%` }} />
            <div className="ll-bar-thumb" style={{ left: `${progress}%` }} />
          </div>
        </div>

        <div className="ll-transport" role="toolbar" aria-label={t("losslessTransportLabel")}>
          <button type="button" className="ll-btn" aria-label={t("losslessPrev")} title={t("losslessPrevTitle")} onClick={() => handleAdvance("prev")} disabled={queue.length < 2}>
            <span aria-hidden="true">⏮</span>
          </button>
          <button type="button" className="ll-btn is-primary" aria-label={playing ? t("losslessPause") : t("losslessPlay")} title={t("losslessPlayTitle")} onClick={togglePlay}>
            <span aria-hidden="true">{playing ? "⏸" : "▶"}</span>
          </button>
          <button type="button" className="ll-btn" aria-label={t("losslessNext")} title={t("losslessNextTitle")} onClick={() => handleAdvance("next")} disabled={queue.length < 2}>
            <span aria-hidden="true">⏭</span>
          </button>
          <button type="button" className={`ll-btn${shuffle ? " is-active" : ""}`} aria-label={t("losslessShuffle")} aria-pressed={shuffle} title={t("losslessShuffleTitle")} onClick={() => setShuffle((s) => !s)}>
            <span aria-hidden="true">⇄</span>
          </button>
          <button type="button" className={`ll-btn is-repeat-${repeatMode}`} aria-label={t("losslessRepeat")} title={t("losslessRepeatTitle")} onClick={() => setRepeatMode((m) => (m === "off" ? "all" : m === "all" ? "one" : "off"))}>
            <span aria-hidden="true">{repeatMode === "one" ? "↻¹" : "↻"}</span>
          </button>
          <button type="button" className={`ll-btn${abLoop ? " is-active" : ""}`} aria-label={t("losslessAbLoop")} aria-pressed={abLoop != null} title={t("losslessAbLoopTitle")} onClick={() => abLoop ? clearAbLoop() : setAbLoopMark("a")}>
            <span aria-hidden="true">A↔B</span>
          </button>
          <div className="ll-volume">
            <button type="button" className="ll-btn is-icon" aria-label={muted ? t("losslessUnmute") : t("losslessMute")} onClick={() => setMuted((m) => !m)}>
              <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => { setMuted(false); setVolume(Number(e.target.value)); }}
              aria-label={t("losslessVolume")}
              className="ll-volume-slider"
            />
          </div>
          <button type="button" className="ll-btn" aria-label={t("losslessOpenInSystem")} title={t("losslessOpenInSystem")} onClick={exportTrackToSystem}>
            <span aria-hidden="true">↗</span>
          </button>
        </div>

        <details className="ll-queue" open={queueOpen} onToggle={(e) => setQueueOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>
            <span className="ll-queue-title">{t("losslessQueue")}</span>
            <span className="ll-queue-count">{tf("losslessQueueCount", { count: queue.length })}</span>
            {queueFolder ? <span className="ll-queue-folder" title={queueFolder}>{queueFolder}</span> : null}
            <button type="button" className="ll-btn is-tiny" onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const picked = await window.electronAPI.selectFolderDialog();
              if (picked) await importFolder(picked);
            }}>{t("losslessQueueAddFolder")}</button>
          </summary>
          <ol className="ll-queue-list">
            {queue.map((item, index) => (
              <li key={item.path} className={`ll-queue-item${index === currentIndex ? " is-current" : ""}`}>
                <button type="button" className="ll-queue-open" onClick={() => playIndex(index)} title={item.path}>
                  <span className="ll-queue-num">{index + 1}</span>
                  <span className="ll-queue-name">{item.name}</span>
                </button>
                <button type="button" className="ll-btn is-tiny" aria-label={t("losslessQueueRemove")} onClick={() => {
                  setQueue((prev) => {
                    const next = prev.filter((_, i) => i !== index);
                    if (index < currentIndex) setCurrentIndex((ci) => ci - 1);
                    else if (index === currentIndex) setCurrentIndex(-1);
                    return next;
                  });
                }}>×</button>
              </li>
            ))}
            {queue.length === 0 ? <li className="ll-queue-empty">{t("losslessQueueEmpty")}</li> : null}
          </ol>
        </details>
      </div>

      <audio
        ref={audioRef}
        src={source ?? undefined}
        preload="metadata"
        onError={() => setError(t("mediaCodecUnsupported"))}
      >
        {t("mediaAudioFallbackBody")}
      </audio>

      {!lossless ? (
        <div className="ll-warning" role="note">{t("losslessFormatNote")}</div>
      ) : null}
    </div>
  );
}
