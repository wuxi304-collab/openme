// audioMeter — pure helpers for converting raw AnalyserNode time-domain
// samples into amplitude / peak values that drive the LosslessAudioPlayer's
// VU meter UI. Kept side-effect-free so it can be unit-tested in plain
// jsdom without instantiating AudioContext.

/** Convert a 0..1 linear amplitude into a dBFS value (clamped to a floor). */
export function amplitudeToDb(amplitude: number, floorDb: number = -60): number {
  if (amplitude <= 0) return floorDb;
  const db = 20 * Math.log10(amplitude);
  return Math.max(floorDb, db);
}

/** RMS of a Uint8Array time-domain buffer (0..1). */
export function computeRms(buffer: Uint8Array): number {
  if (buffer.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < buffer.length; i++) {
    const v = (buffer[i] - 128) / 128;
    sumSq += v * v;
  }
  return Math.min(1, Math.sqrt(sumSq / buffer.length));
}

/** Peak (max abs) of a Uint8Array time-domain buffer (0..1). */
export function computePeak(buffer: Uint8Array): number {
  if (buffer.length === 0) return 0;
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const v = Math.abs((buffer[i] - 128) / 128);
    if (v > peak) peak = v;
  }
  return peak > 1 ? 1 : peak;
}

/** Smoothing constant for the peak-hold decay (1.0 = no decay). */
export const PEAK_HOLD_MS = 1500;

/** Step the peak-hold state forward by `deltaMs` milliseconds, returning the
 *  current held peak amplitude. The peak jumps up instantly when new audio
 *  exceeds it and decays smoothly after PEAK_HOLD_MS. */
export function stepPeakHold(
  previous: { peak: number; capturedAt: number },
  newPeak: number,
  now: number,
  floorDb: number = -60,
): { peak: number; capturedAt: number } {
  // New peak above current hold → snap to it.
  if (newPeak > previous.peak) return { peak: newPeak, capturedAt: now };
  // No new peak — start/continue the decay.
  const elapsed = now - previous.capturedAt;
  if (elapsed < PEAK_HOLD_MS) return previous;
  // Exponential decay after hold window. ~30dB drop per second.
  const decayPerMs = 0.03 / 1000;
  const decayed = previous.peak * Math.pow(10, -decayPerMs * elapsed);
  if (amplitudeToDb(decayed, floorDb) <= floorDb) return { peak: 0, capturedAt: now };
  return { peak: decayed, capturedAt: previous.capturedAt };
}

/** Channel snapshot emitted by the meter loop to the React state. */
export interface MeterFrame {
  left: number;
  right: number;
  leftDb: number;
  rightDb: number;
  peakLeft: number;
  peakRight: number;
  peakLeftDb: number;
  peakRightDb: number;
}

/** The dB floor used everywhere — silence snaps to this value. */
export const METER_FLOOR_DB = -60;

/** Build a fresh, fully-zeroed frame. */
export function emptyMeterFrame(): MeterFrame {
  return {
    left: 0,
    right: 0,
    leftDb: METER_FLOOR_DB,
    rightDb: METER_FLOOR_DB,
    peakLeft: 0,
    peakRight: 0,
    peakLeftDb: METER_FLOOR_DB,
    peakRightDb: METER_FLOOR_DB,
  };
}

/** Build a frame from the analyser buffers and current peak-hold state. */
export function buildMeterFrame(
  leftBuffer: Uint8Array,
  rightBuffer: Uint8Array,
  peakHoldLeft: { peak: number; capturedAt: number },
  peakHoldRight: { peak: number; capturedAt: number },
  now: number,
): { frame: MeterFrame; nextLeft: { peak: number; capturedAt: number }; nextRight: { peak: number; capturedAt: number } } {
  const left = computeRms(leftBuffer);
  const right = computeRms(rightBuffer);
  const leftPeak = computePeak(leftBuffer);
  const rightPeak = computePeak(rightBuffer);
  const nextLeft = stepPeakHold(peakHoldLeft, leftPeak, now);
  const nextRight = stepPeakHold(peakHoldRight, rightPeak, now);
  return {
    frame: {
      left,
      right,
      leftDb: amplitudeToDb(left),
      rightDb: amplitudeToDb(right),
      peakLeft: nextLeft.peak,
      peakRight: nextRight.peak,
      peakLeftDb: amplitudeToDb(nextLeft.peak),
      peakRightDb: amplitudeToDb(nextRight.peak),
    },
    nextLeft,
    nextRight,
  };
}