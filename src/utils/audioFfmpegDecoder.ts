// src/utils/audioFfmpegDecoder.ts
//
// Renderer-side wrapper around the universal audio decoder exposed by
// electron/audioFfmpeg.js (via preload). The decoder turns any audio
// format ffmpeg can demux+decode into raw interleaved 32-bit float PCM
// streamed in chunks back to the renderer over IPC.
//
// Why this exists:
//   - Chromium's built-in <audio> decoder doesn't handle FLAC, ALAC,
//     AIFF, DSD, APE, WavPack, TAK, WMA reliably across versions.
//   - Hand-rolling JS decoders for each format is a maintenance trap
//     (audio-decode / wasm-audio-decoders don't cover DSD/APE/TAK/WMA).
//   - ffmpeg-static is a single 80 MB binary that decodes everything
//     and is faster than WASM in practice.
//
// Contract:
//   - We get one `audio-pcm-meta` event with the file's format block
//     (sampleRate, channels, bitDepth, duration, codec, container,
//     lossless, bitrate) sent by music-metadata in the main process
//     BEFORE ffmpeg starts spawning.
//   - We get N `audio-pcm-chunk` events with raw f32le bytes. Each
//     chunk is a self-contained ArrayBuffer (the main process copies
//     bytes to detach from the spawn pipe's buffer).
//   - We get one `audio-pcm-done` event with `ok`, total bytes, and
//     an optional error.
//
// Usage:
//   const dec = new AudioFfmpegDecoder();
//   const { meta, audioBuffer } = await dec.decode(filePath, {
//     onProgress?: (receivedBytes) => void;
//   });
//   audioBuffer can be played via AudioContext.

import type { AudioMetadataResult } from "../types/electron-api";

export interface AudioFfmpegMeta {
  /** Native sample rate (Hz) the file was encoded at. */
  sampleRate: number | null;
  /** Native channel count. */
  channels: number | null;
  /** Bits per sample (8/16/24/32 etc.). */
  bitDepth: number | null;
  /** Total duration in seconds (from music-metadata). */
  durationSec: number | null;
  /** Codec name (e.g. "flac", "mp3", "pcm_s16le"). */
  codec: string | null;
  /** Container format (e.g. "FLAC", "MPEG 1 Layer 3", "WAVE"). */
  container: string | null;
  /** True for lossless codecs (FLAC, ALAC, WAV, AIFF, WavPack, APE, TAK, DSD). */
  lossless: boolean | null;
  /** Bitrate in kbps (lossy files). */
  bitrate: number | null;
}

export interface AudioFfmpegProgress {
  receivedBytes: number;
  /** Filled in once the file size is known. */
  expectedBytes: number | null;
}

export interface AudioFfmpegResult {
  /** Resolved metadata block. */
  meta: AudioFfmpegMeta;
  /** Decoded PCM as a Web Audio AudioBuffer. */
  audioBuffer: AudioBuffer;
  /** Total PCM bytes received (sanity check). */
  totalBytes: number;
}

export interface AudioFfmpegOptions {
  /** Resample to this rate. 0 = native. Default 48000. */
  targetSampleRate?: number;
  /** Force channel count. 0 = native. Default 2 (stereo). */
  targetChannels?: number;
  /** Optional progress callback. */
  onProgress?: (p: AudioFfmpegProgress) => void;
  /** File size hint, used to compute the progress percentage. */
  expectedBytes?: number | null;
}

// Note: the electronAPI fields consumed here are declared globally in
// src/types/electron-api.d.ts (see ElectronAudioBridge interface).

/**
 * Progressive AudioFfmpegDecoder. Each instance registers fresh IPC
 * listeners; keep one per active decode and call `cancel()` to abort
 * mid-stream (the main process SIGKILLs the ffmpeg child).
 */
export class AudioFfmpegDecoder {
  private audioContext: AudioContext | null = null;
  private active: { requestId: string; offMeta: () => void; offChunk: () => void; offDone: () => void; cancelled: boolean } | null = null;

  /**
   * Lazy-create a shared AudioContext. The first call after a fresh
   * page load MUST be triggered by a user gesture (Chromium autoplay
   * policy), so callers should call this in response to a click.
   */
  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      // AudioContext is the standard Web Audio context; falls back to
      // webkitAudioContext on older Chromium. The "20.1.2" type lib
      // covers the modern API.
      const Ctor: typeof AudioContext = (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new Ctor();
    }
    return this.audioContext;
  }

  /**
   * Decode the given file. Resolves once the `audio-pcm-done` event
   * arrives. Rejects if the decode fails or is cancelled.
   */
  async decode(filePath: string, options: AudioFfmpegOptions = {}): Promise<AudioFfmpegResult> {
    if (typeof window === "undefined" || !window.electronAPI?.decodeAudioPcm) {
      throw new Error("audioFfmpegDecoder: not running under Electron preload");
    }
    if (this.active) {
      // Defensive: cancel the previous decode so we don't leak listeners.
      this.cancel();
    }

    const ctx = this.ensureContext();
    const api = window.electronAPI;

    // Set up listeners BEFORE the invoke so we can't miss the meta event.
    let metaPromise: Promise<AudioFfmpegMeta | null>;
    let resolveMeta!: (m: AudioFfmpegMeta | null) => void;
    metaPromise = new Promise<AudioFfmpegMeta | null>((res) => { resolveMeta = res; });

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    let offMeta = api.onAudioPcmMeta((payload) => {
      if (!this.active || payload.requestId !== this.active.requestId) return;
      resolveMeta(payload.meta || null);
    });

    let offChunk = api.onAudioPcmChunk((payload) => {
      if (!this.active || payload.requestId !== this.active.requestId) return;
      const bytes = new Uint8Array(payload.bytes);
      chunks.push(bytes);
      totalBytes += bytes.byteLength;
      if (options.onProgress) {
        options.onProgress({
          receivedBytes: totalBytes,
          expectedBytes: options.expectedBytes ?? null,
        });
      }
    });

    let donePromise: Promise<{ ok: boolean; totalBytes: number; error?: { code: string; message: string } }>;
    let resolveDone!: (v: { ok: boolean; totalBytes: number; error?: { code: string; message: string } }) => void;
    donePromise = new Promise((res) => { resolveDone = res; });

    let offDone = api.onAudioPcmDone((payload) => {
      if (!this.active || payload.requestId !== this.active.requestId) return;
      resolveDone(payload);
    });

    const invokeResult = await api.decodeAudioPcm(filePath, {
      targetSampleRate: options.targetSampleRate ?? 48000,
      targetChannels: options.targetChannels ?? 2,
      expectedBytes: options.expectedBytes ?? null,
    });

    if (!invokeResult.ok || !invokeResult.requestId) {
      offMeta(); offChunk(); offDone();
      const err = invokeResult.error || { code: "FFMPEG_INVOKE_FAILED", message: "decodeAudioPcm returned not-ok" };
      throw new Error(`[${err.code}] ${err.message}`);
    }

    this.active = { requestId: invokeResult.requestId, offMeta, offChunk, offDone, cancelled: false };

    // If the main process couldn't spawn ffmpeg, it returns the error
    // synchronously inside the invoke. We still might receive a `done`
    // event with ok=false; wait for it to clean up.
    const done = await donePromise;

    // Detach listeners now that the stream is complete.
    offMeta(); offChunk(); offDone();
    this.active = null;

    if (done.ok !== true) {
      const err = done.error || { code: "FFMPEG_DECODE_FAILED", message: "ffmpeg exited with unknown error" };
      throw new Error(`[${err.code}] ${err.message}`);
    }

    const meta = await metaPromise;

    // Build the AudioBuffer. The IPC contract says f32le interleaved PCM
    // at the requested targetSampleRate / targetChannels; if the main
    // process kept the native rate (targetSampleRate=0) we use that
    // instead.
    const effectiveRate = options.targetSampleRate && options.targetSampleRate > 0
      ? options.targetSampleRate
      : (meta && typeof meta.sampleRate === "number" ? meta.sampleRate : 48000);
    const effectiveChannels = options.targetChannels && options.targetChannels > 0
      ? options.targetChannels
      : (meta && typeof meta.channels === "number" ? meta.channels : 2);

    // Compute total frame count from the byte stream (4 bytes per sample).
    const totalSamples = Math.floor(totalBytes / 4);
    const frameCount = Math.floor(totalSamples / effectiveChannels);

    const audioBuffer = ctx.createBuffer(effectiveChannels, Math.max(1, frameCount), effectiveRate);

    // Copy each chunk into the AudioBuffer's channel data. We copy in
    // order so the playback timeline is correct. Chunks from IPC are
    // already in playback order from ffmpeg.
    const channelData: Float32Array[] = [];
    for (let c = 0; c < effectiveChannels; c++) {
      channelData.push(audioBuffer.getChannelData(c));
    }
    let sampleOffset = 0;
    for (const chunk of chunks) {
      const view = new Float32Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / 4);
      // Deinterleave into the per-channel arrays.
      for (let i = 0; i < view.length; i += effectiveChannels) {
        for (let c = 0; c < effectiveChannels; c++) {
          const sample = view[i + c];
          // Guard against the trailing partial frame ffmpeg might emit
          // when the source has an odd channel count.
          if (sampleOffset + (i / effectiveChannels) < channelData[c].length) {
            channelData[c][(sampleOffset + i / effectiveChannels) | 0] = sample;
          }
        }
      }
      sampleOffset += view.length / effectiveChannels;
    }

    return {
      meta: meta || {
        sampleRate: effectiveRate,
        channels: effectiveChannels,
        bitDepth: null,
        durationSec: effectiveRate > 0 ? frameCount / effectiveRate : null,
        codec: null,
        container: null,
        lossless: null,
        bitrate: null,
      },
      audioBuffer,
      totalBytes,
    };
  }

  /**
   * Cancel the in-flight decode (if any). Safe to call multiple times.
   */
  cancel(): void {
    if (!this.active) return;
    const { requestId, offMeta, offChunk, offDone } = this.active;
    this.active = null;
    try { offMeta(); offChunk(); offDone(); } catch (_) { /* ignore */ }
    try { window.electronAPI?.cancelAudioDecode(requestId); } catch (_) { /* ignore */ }
  }

  /**
   * Release the shared AudioContext. Subsequent `decode()` calls will
   * lazily create a new one.
   */
  dispose(): void {
    this.cancel();
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (_) { /* ignore */ }
      this.audioContext = null;
    }
  }
}

/** Convenience: probe whether ffmpeg is available without actually decoding.
 *  Sync variant — assumes the preload script has cached `info.ffmpegPath` in
 *  a synchronously-readable side channel. Returns true when the preload has
 *  reported that ffmpeg exists, false otherwise.
 */
export function isFfmpegAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const api = window.electronAPI as unknown as { getFfmpegInfo?: () => Promise<{ available: boolean }> } | undefined;
  // The preload can't synchronously probe the filesystem, so we mark ffmpeg
  // "available" optimistically and let the actual decode attempt succeed or
  // fail. Once the decode succeeds/fails we cache the result back into this
  // getter via setCachedFfmpegAvailability(). On the very first run the user
  // might see an engine path that ends up failing — the catch in
  // LosslessAudioPlayer falls through to the existing <audio> fallback.
  if (!api?.getFfmpegInfo) return false;
  return getCachedFfmpegAvailability();
}

let _cached = true;
export function setCachedFfmpegAvailability(value: boolean): void {
  _cached = value;
}
function getCachedFfmpegAvailability(): boolean {
  return _cached;
}

// Re-export the metadata type alias so existing imports keep working.
export type { AudioMetadataResult };
