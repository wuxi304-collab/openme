// @vitest-environment jsdom
// PR #146 — AudioFfmpegDecoder unit tests. Mocks the IPC bridge exposed
// by electron/preload.js so we can drive the meta / chunk / done event
// flow without spawning the actual ffmpeg binary.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AudioFfmpegDecoder, isFfmpegAvailable, setCachedFfmpegAvailability } from "./audioFfmpegDecoder";

type Listener<T> = (payload: T) => void;

interface MockBridge {
  decodeAudioPcm: ReturnType<typeof vi.fn>;
  cancelAudioDecode: ReturnType<typeof vi.fn>;
  getFfmpegInfo: ReturnType<typeof vi.fn>;
  onAudioPcmMeta: (cb: Listener<any>) => () => void;
  onAudioPcmChunk: (cb: Listener<any>) => () => void;
  onAudioPcmDone: (cb: Listener<any>) => () => void;
  /** Test-only: emit a fake event to subscribed listeners. */
  emitMeta: (payload: any) => void;
  emitChunk: (payload: any) => void;
  emitDone: (payload: any) => void;
}

function installMockBridge(): MockBridge {
  // Install a minimal AudioContext so the decoder can build the AudioBuffer.
  class MockAudioContext {
    state: "running" | "suspended" | "closed" = "running";
    currentTime = 0;
    destination = {} as unknown as AudioDestinationNode;
    createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
      const chans: Float32Array[] = [];
      for (let c = 0; c < channels; c++) chans.push(new Float32Array(length));
      return { sampleRate, length, duration: length / sampleRate, numberOfChannels: channels, getChannelData(c: number) { return chans[c]; }, copyFromChannel: () => undefined, copyToChannel: () => undefined } as unknown as AudioBuffer;
    }
  }
  (globalThis as unknown as { AudioContext: typeof AudioContext }).AudioContext = MockAudioContext as unknown as typeof AudioContext;
  (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = MockAudioContext as unknown as typeof AudioContext;

  const metaListeners: Array<Listener<any>> = [];
  const chunkListeners: Array<Listener<any>> = [];
  const doneListeners: Array<Listener<any>> = [];

  // Each call to decodeAudioPcm assigns a new requestId and emits the
  // done event asynchronously to mimic the real main process flow.
  let seq = 0;
  const bridge: MockBridge = {
    decodeAudioPcm: vi.fn(async (filePath, _opts) => {
      seq += 1;
      const requestId = `audec-test-${seq}`;
      // Defer emits to the next event-loop turn to mimic the real main
      // process IPC delivery (always crosses the event boundary).
      setTimeout(() => {
        bridge.emitMeta({ requestId, ok: true, meta: { sampleRate: 48000, channels: 2, bitDepth: 24, durationSec: 0.05, codec: "flac", container: "FLAC", lossless: true, bitrate: null } });
        const bytes = new ArrayBuffer(400);
        new Uint8Array(bytes).fill(0);
        bridge.emitChunk({ requestId, bytes });
        bridge.emitDone({ requestId, ok: true, totalBytes: 400 });
      }, 0);
      return { ok: true, requestId };
    }),
    cancelAudioDecode: vi.fn(),
    getFfmpegInfo: vi.fn(async () => ({ available: true, version: "test" })),
    onAudioPcmMeta: (cb) => { metaListeners.push(cb); return () => { const i = metaListeners.indexOf(cb); if (i >= 0) metaListeners.splice(i, 1); }; },
    onAudioPcmChunk: (cb) => { chunkListeners.push(cb); return () => { const i = chunkListeners.indexOf(cb); if (i >= 0) chunkListeners.splice(i, 1); }; },
    onAudioPcmDone: (cb) => { doneListeners.push(cb); return () => { const i = doneListeners.indexOf(cb); if (i >= 0) doneListeners.splice(i, 1); }; },
    emitMeta: (payload) => { for (const cb of metaListeners) cb(payload); },
    emitChunk: (payload) => { for (const cb of chunkListeners) cb(payload); },
    emitDone:  (payload) => { for (const cb of doneListeners)  cb(payload);  },
  };
  (window as unknown as { electronAPI: unknown }).electronAPI = bridge;
  return bridge;
}

describe("AudioFfmpegDecoder (PR #146)", () => {
  let bridge: MockBridge;
  beforeEach(() => {
    bridge = installMockBridge();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("decodes a fake file and returns an AudioBuffer", async () => {
    const decoder = new AudioFfmpegDecoder();
    const result = await decoder.decode("C:/music/song.flac", { targetSampleRate: 48000, targetChannels: 2 });
    expect(result.meta.sampleRate).toBe(48000);
    expect(result.meta.channels).toBe(2);
    expect(result.meta.codec).toBe("flac");
    expect(result.audioBuffer.sampleRate).toBe(48000);
    expect(result.audioBuffer.numberOfChannels).toBe(2);
    // 400 bytes / 4 bytes-per-sample / 2 channels = 50 frames @ 48 kHz ≈ 0.001s.
    expect(result.audioBuffer.duration).toBeGreaterThan(0);
    decoder.dispose();
  });

  it("reports progress as bytes stream in", async () => {
    const decoder = new AudioFfmpegDecoder();
    const progress: number[] = [];
    const result = await decoder.decode("fake.flac", {
      onProgress: (p) => progress.push(p.receivedBytes),
    });
    expect(progress.length).toBe(1);
    expect(progress[0]).toBe(400);
    expect(result.totalBytes).toBe(400);
    decoder.dispose();
  });

  it("rejects when the bridge reports ok=false on done", async () => {
    const decoder = new AudioFfmpegDecoder();
    // Monkey-patch the bridge to fail.
    bridge.decodeAudioPcm = vi.fn(async () => {
      const requestId = "audec-fail-1";
      setTimeout(() => bridge.emitDone({ requestId, ok: false, totalBytes: 0, error: { code: "E_FAIL", message: "simulated" } }), 0);
      return { ok: true, requestId };
    });
    await expect(decoder.decode("fake.flac")).rejects.toThrow(/simulated/);
    decoder.dispose();
  });

  it("cancel() detaches listeners and aborts the in-flight decode", () => {
    const decoder = new AudioFfmpegDecoder();
    const inflight = decoder.decode("fake.flac");
    decoder.cancel();
    // We don't assert the rejection shape here — the real main process
    // would SIGKILL the child; in this stub the listeners are detached
    // and the resolve/reject path is detached too. Just ensure cancel
    // doesn't throw.
    expect(() => decoder.cancel()).not.toThrow();
    // Swallow any pending rejection.
    inflight.catch(() => undefined);
  });

  it("isFfmpegAvailable() reads the cached value", () => {
    setCachedFfmpegAvailability(true);
    expect(isFfmpegAvailable()).toBe(true);
    setCachedFfmpegAvailability(false);
    expect(isFfmpegAvailable()).toBe(false);
  });
});
