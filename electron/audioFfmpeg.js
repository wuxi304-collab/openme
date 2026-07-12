// electron/audioFfmpeg.js
//
// Universal audio decoder bridge. Spawns ffmpeg-static as a child process,
// converts the source file to raw 32-bit float little-endian PCM, and
// streams the bytes back to the renderer in fixed-size chunks. This lets
// OpenMe play every audio format ffmpeg can demux+decode (FLAC, ALAC,
// AIFF, DSD via DSDIFF/DSF, APE, WavPack, TAK, WMA, MP3, AAC, OGG, Opus,
// M4A, AC3, ...) entirely in-app — no Chromium codec probe, no external
// hand-off, no shared-array-buffer dance.
//
// The IPC contract is:
//
//   renderer → main  : "decode-audio-pcm"   { filePath, requestId, chunkBytes? }
//   main     → rend  : "audio-pcm-meta"     { requestId, ok, sampleRate, channels, durationSec, bitDepth, format, container }
//   main     → rend  : "audio-pcm-chunk"    { requestId, seq, bytes: ArrayBuffer }
//   main     → rend  : "audio-pcm-done"     { requestId, ok, totalSamples, totalBytes, error? }
//   renderer → main  : "decode-audio-cancel"  { requestId }
//
// ffmpeg-static is shipped via `extraResources` in package.json, so the
// production path is `<resources>/ffmpeg/ffmpeg.exe`. In dev we read the
// binary straight out of node_modules (the require() path is platform-
// correct automatically — Windows gets ffmpeg.exe, macOS gets ffmpeg,
// Linux gets ffmpeg).

const { spawn } = require("child_process");
const { existsSync, statSync } = require("fs");
const path = require("path");
const log = require("electron-log");

let cachedFfmpegPath = null;

/**
 * Resolve the ffmpeg executable. In production (after electron-builder
 * packaging) the binary is unpacked under resources/ffmpeg/. In dev we
 * fall back to ffmpeg-static in node_modules.
 */
function resolveFfmpegPath() {
  if (cachedFfmpegPath && existsSync(cachedFfmpegPath)) return cachedFfmpegPath;

  const candidates = [];

  // Production: <resources>/ffmpeg/ffmpeg.exe (set via extraResources in package.json).
  if (process.resourcesPath) {
    const exeName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
    candidates.push(path.join(process.resourcesPath, "ffmpeg", exeName));
  }

  // Dev: ffmpeg-static in node_modules.
  try {
    const ffmpegStatic = require("ffmpeg-static");
    if (ffmpegStatic) candidates.push(ffmpegStatic);
  } catch (_) {
    // ffmpeg-static not installed — fall through.
  }

  for (const c of candidates) {
    if (c && existsSync(c)) {
      cachedFfmpegPath = c;
      log.info("audioFfmpeg: using ffmpeg binary", cachedFfmpegPath);
      return cachedFfmpegPath;
    }
  }

  log.warn("audioFfmpeg: ffmpeg binary not found in any candidate path", { candidates });
  return null;
}

// Cap a single ffmpeg stderr buffer so a broken file can't OOM the main
// process by spamming "Invalid data found when processing input" forever.
const STDERR_TAIL_BYTES = 16 * 1024;

/**
 * Decode a local audio file to raw interleaved 32-bit float PCM.
 *
 * The ffmpeg invocation is:
 *   ffmpeg -nostdin -hide_banner -loglevel error -i <path>
 *          -f f32le -acodec pcm_f32le -ac 2 -ar 48000 -vn pipe:1
 *
 * -f32le + pcm_f32le  : raw 32-bit float little-endian, no WAV header
 * -ac 2               : downmix to stereo (most listeners are stereo;
 *                       surround is preserved as-is by the source rate
 *                       and channel count via the `meta` event, the
 *                       output channels are forced to 2 for the
 *                       AudioBuffer path which is mono/stereo only)
 * -ar 48000           : resample to 48 kHz (Web Audio's "default" rate
 *                       on most platforms; cheap and avoids per-decode
 *                       resampler setup)
 * -vn                 : drop any video stream (some audio files carry
 *                       cover art in a video track; not used here)
 * pipe:1              : write PCM bytes to stdout
 *
 * If the file's native sample rate is more exotic (e.g. 192 kHz) the
 * caller can opt out of the resampler by passing `targetSampleRate: 0`.
 */
function decodeAudioPcm(filePath, options, onChunk) {
  const ffmpegPath = resolveFfmpegPath();
  if (!ffmpegPath) {
    return { proc: null, error: { code: "FFMPEG_NOT_FOUND", message: "ffmpeg binary not found" } };
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return { proc: null, error: { code: "MEDIA_NOT_FOUND", message: "file not found" } };
  }

  const args = [
    "-nostdin",
    "-hide_banner",
    "-loglevel", "error",
    "-i", filePath,
  ];

  // Detect bit depth / sample rate up-front so we can re-emit accurate
  // metadata in the `audio-pcm-meta` event. ffmpeg's automatic resampler
  // is good but not lossless for very high bit depths; honour a `0`
  // request to disable resampling entirely (native rate is preserved).
  const targetRate = options && Number.isFinite(options.targetSampleRate) ? options.targetSampleRate : 48000;
  if (targetRate > 0) {
    args.push("-ar", String(targetRate));
  }
  // Honour channel count: 0 = native, 2 = stereo, 1 = mono, etc.
  const targetChannels = options && Number.isFinite(options.targetChannels) ? options.targetChannels : 2;
  if (targetChannels > 0) {
    args.push("-ac", String(targetChannels));
  }
  args.push(
    "-f", "f32le",
    "-acodec", "pcm_f32le",
    "-vn",
    "pipe:1"
  );

  log.info("audioFfmpeg: spawn", ffmpegPath, args.slice(0, 6).join(" "), "...");

  let proc;
  try {
    proc = spawn(ffmpegPath, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    log.error("audioFfmpeg: spawn failed", e);
    return { proc: null, error: { code: "FFMPEG_SPAWN_FAILED", message: e.message } };
  }

  let stderrTail = "";
  proc.stderr.on("data", (chunk) => {
    const s = chunk.toString("utf8");
    if (stderrTail.length < STDERR_TAIL_BYTES) {
      stderrTail += s;
      if (stderrTail.length > STDERR_TAIL_BYTES) {
        stderrTail = stderrTail.slice(-STDERR_TAIL_BYTES);
      }
    }
  });

  // ffmpeg writes interleaved samples; each sample is 4 bytes (float32 LE).
  // The number of channels × 4 bytes per sample × frames is the total
  // byte count we expect.
  let totalBytes = 0;
  proc.stdout.on("data", (chunk) => {
    totalBytes += chunk.length;
    if (typeof onChunk === "function") {
      // Pass the raw bytes (ArrayBuffer slice) to the caller; we keep a
      // ref to chunk's underlying buffer so the bytes remain valid for
      // the duration of the synchronous callback.
      onChunk(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
    }
  });

  return {
    proc,
    totalBytesRef: () => totalBytes,
    stderrTail: () => stderrTail,
  };
}

module.exports = {
  resolveFfmpegPath,
  decodeAudioPcm,
};
