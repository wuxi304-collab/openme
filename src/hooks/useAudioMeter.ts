// useAudioMeter — React hook that wires a <audio> element into a Web Audio
// AnalyserNode graph and emits an RMS + peak frame at ~10 Hz while playing.
//
// Output rate is intentionally throttled to avoid the React render storm of a
// raw requestAnimationFrame loop. Peak hold and decay are kept in refs so
// they keep moving smoothly between state updates.
//
// Lifecycle:
//   1. On first source-load (i.e. filePath resolves to a media URL), build
//      AudioContext → MediaElementSource → ChannelSplitter → 2 AnalyserNodes.
//      Reuse across tracks — we only rebuild the graph if no element was ever
//      connected.
//   2. On `playing` going true, requestAnimationFrame loop drives `frame`.
//   3. On unmount, cancelAnimationFrame + close the AudioContext.
//
// We tolerate AudioContext being unavailable (SSR / older Electron) by
// silently doing nothing — the player still works, just without a meter.

import { useEffect, useRef, useState } from "react";
import {
  METER_FLOOR_DB,
  buildMeterFrame,
  emptyMeterFrame,
  type MeterFrame,
} from "../utils/audioMeter";

interface Options {
  /** React ref to the HTMLAudioElement the meter should listen to. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Whether playback is currently active. */
  playing: boolean;
  /** Whether a media source URL has been resolved. */
  sourceReady: boolean;
}

const EMIT_INTERVAL_MS = 100;

type PeakHoldState = { peak: number; capturedAt: number };

export function useAudioMeter({ audioRef, playing, sourceReady }: Options) {
  const [frame, setFrame] = useState<MeterFrame>(emptyMeterFrame());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const leftAnalyserRef = useRef<AnalyserNode | null>(null);
  const rightAnalyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastEmitRef = useRef(0);
  const peakLeftRef = useRef<PeakHoldState>({ peak: 0, capturedAt: 0 });
  const peakRightRef = useRef<PeakHoldState>({ peak: 0, capturedAt: 0 });

  // Build the audio graph once we have both an audio element AND a resolved
  // media source. Re-running the effect won't rebuild — we keep the refs.
  useEffect(() => {
    if (!sourceReady) return;
    const el = audioRef.current;
    if (!el) return;
    if (audioCtxRef.current) return; // already built
    const AudioCtor: typeof AudioContext | undefined =
      typeof window !== "undefined"
        ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AudioCtor) return;
    try {
      const ctx = new AudioCtor();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaElementSource(el);
      // Important: also pipe source → destination so audio is audible.
      source.connect(ctx.destination);
      const splitter = ctx.createChannelSplitter(2);
      source.connect(splitter);
      const leftAnalyser = ctx.createAnalyser();
      const rightAnalyser = ctx.createAnalyser();
      leftAnalyser.fftSize = 1024;
      rightAnalyser.fftSize = 1024;
      leftAnalyser.smoothingTimeConstant = 0.4;
      rightAnalyser.smoothingTimeConstant = 0.4;
      splitter.connect(leftAnalyser, 0);
      splitter.connect(rightAnalyser, 1);
      leftAnalyserRef.current = leftAnalyser;
      rightAnalyserRef.current = rightAnalyser;
    } catch (reason) {
      // Some browsers throw if the element already has a source attached.
      console.warn("useAudioMeter: failed to build audio graph", reason);
    }
  }, [audioRef, sourceReady]);

  // Drive the meter loop while playing.
  useEffect(() => {
    if (!playing) {
      // Drop the bars to silence quickly so the UI feels responsive.
      setFrame(emptyMeterFrame());
      peakLeftRef.current = { peak: 0, capturedAt: 0 };
      peakRightRef.current = { peak: 0, capturedAt: 0 };
      return;
    }
    const analyserL = leftAnalyserRef.current;
    const analyserR = rightAnalyserRef.current;
    if (!analyserL || !analyserR) return;

    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === "suspended") void ctx.resume();

    const bufferL = new Uint8Array(analyserL.fftSize);
    const bufferR = new Uint8Array(analyserR.fftSize);

    const tick = (now: number) => {
      analyserL.getByteTimeDomainData(bufferL);
      analyserR.getByteTimeDomainData(bufferR);
      const { frame: next, nextLeft, nextRight } = buildMeterFrame(
        bufferL,
        bufferR,
        peakLeftRef.current,
        peakRightRef.current,
        now,
      );
      peakLeftRef.current = nextLeft;
      peakRightRef.current = nextRight;
      if (now - lastEmitRef.current >= EMIT_INTERVAL_MS) {
        lastEmitRef.current = now;
        setFrame(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing]);

  // Tear down the AudioContext on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const ctx = audioCtxRef.current;
      if (ctx) void ctx.close().catch(() => undefined);
      audioCtxRef.current = null;
      leftAnalyserRef.current = null;
      rightAnalyserRef.current = null;
    };
  }, []);

  return { frame, floorDb: METER_FLOOR_DB };
}