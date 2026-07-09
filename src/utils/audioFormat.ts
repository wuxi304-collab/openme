// Display formatters and quality classifiers for audio metadata.
//
// We intentionally keep these pure (no React, no DOM) so the same helpers
// can be reused by the lossless player, the FileSummaryPanel and the
// future "audio inspector" command-palette entry.

import type { AudioMetadataResult } from "../types/electron-api";

const LOSSLESS_EXTS = new Set([".flac", ".wav", ".aif", ".aiff", ".dsf", ".dff"]);

/** Returns true when the extension (with leading dot) is a known lossless codec. */
export function isLosslessExtension(extensionOrPath: string): boolean {
  const ext = extensionOrPath.startsWith(".")
    ? extensionOrPath.toLowerCase()
    : extensionOf(extensionOrPath);
  return LOSSLESS_EXTS.has(ext);
}

function extensionOf(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  const lastSep = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (lastDot <= lastSep || lastDot === -1) return "";
  return filePath.slice(lastDot).toLowerCase();
}

export type QualityTier = "hi-res" | "lossless-cd" | "lossless" | "lossy";

/**
 * Classify an audio file into a quality tier using the format metadata
 * returned by music-metadata. The badge drives the prominent label in
 * the lossless player header.
 *
 *  - hi-res:  lossless AND (≥ 24-bit OR > 48 kHz)
 *  - lossless-cd: lossless AND exactly 16-bit / 44.1 kHz
 *  - lossless: any other lossless container we recognise
 *  - lossy:   everything else (mp3, aac, ogg, opus, m4a, ...)
 */
export function getQualityTier(format: Partial<AudioMetadataResult["format"]> | null | undefined): QualityTier {
  if (!format || format.lossless === false) return "lossy";
  if (format.lossless !== true) {
    // Library couldn't tell us — fall back to the extension hint so the
    // player can still badge "Lossless" for .flac even on a stripped file.
    return "lossless";
  }
  const sr = format.sampleRate ?? 0;
  const bd = format.bitsPerSample ?? 0;
  if (bd >= 24 || sr > 48000) return "hi-res";
  if (bd === 16 && (sr === 44100 || sr === 48000)) return "lossless-cd";
  return "lossless";
}

export function formatSampleRate(hz: number | null | undefined): string {
  if (!hz || !Number.isFinite(hz)) return "—";
  if (hz >= 1000) return `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1)} kHz`;
  return `${Math.round(hz)} Hz`;
}

export function formatBitDepth(bits: number | null | undefined): string {
  if (!bits || !Number.isFinite(bits)) return "—";
  return `${bits}-bit`;
}

export function formatBitrate(kbps: number | null | undefined): string {
  if (!kbps || !Number.isFinite(kbps)) return "—";
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(2)} Mbps`;
  return `${Math.round(kbps)} kbps`;
}

/** Returns the most common channel count strings. Anything > 2 is "Surround". */
export function formatChannels(n: number | null | undefined): string {
  if (!n || !Number.isFinite(n)) return "—";
  if (n === 1) return "1 ch (Mono)";
  if (n === 2) return "2 ch (Stereo)";
  if (n === 6) return "5.1 Surround";
  if (n === 8) return "7.1 Surround";
  return `${n} ch (Surround)`;
}

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Remaining-time formatter used by the player: shows a leading minus sign
 * to match every other audio player. Returns "0:00" for unknown durations.
 */
export function formatRemaining(currentSeconds: number, totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "0:00";
  const remaining = Math.max(0, totalSeconds - currentSeconds);
  return `-${formatDuration(remaining)}`;
}

/** Strip the extension and return a safe track filename for display. */
export function trackDisplayName(filePath: string, fallbackTitle?: string | null): string {
  if (fallbackTitle && fallbackTitle.trim()) return fallbackTitle.trim();
  const lastSep = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  const base = lastSep >= 0 ? filePath.slice(lastSep + 1) : filePath;
  return base.replace(/\.[^.]+$/, "");
}
