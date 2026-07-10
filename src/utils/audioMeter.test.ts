import { describe, expect, it } from "vitest";
import {
  METER_FLOOR_DB,
  PEAK_HOLD_MS,
  amplitudeToDb,
  buildMeterFrame,
  computePeak,
  computeRms,
  emptyMeterFrame,
  stepPeakHold,
} from "./audioMeter";

describe("amplitudeToDb", () => {
  it("maps full-scale 1.0 to 0 dB", () => {
    expect(amplitudeToDb(1)).toBe(0);
  });
  it("maps 0 to the configured floor", () => {
    expect(amplitudeToDb(0)).toBe(METER_FLOOR_DB);
  });
  it("clamps to floor for negative numbers", () => {
    expect(amplitudeToDb(-1)).toBe(METER_FLOOR_DB);
  });
  it("rounds ~0.5 amplitude to ~-6 dB", () => {
    expect(amplitudeToDb(0.5)).toBeCloseTo(-6.02, 1);
  });
});

describe("computeRms", () => {
  it("returns 0 for an empty buffer", () => {
    expect(computeRms(new Uint8Array(0))).toBe(0);
  });
  it("returns 0 for silence (128 = zero)", () => {
    const buf = new Uint8Array(64).fill(128);
    expect(computeRms(buf)).toBe(0);
  });
  it("returns ~0.5 for a ±0.5 square wave", () => {
    const buf = new Uint8Array(64);
    for (let i = 0; i < 64; i++) buf[i] = i % 2 === 0 ? 192 : 64; // ±0.5
    expect(computeRms(buf)).toBeCloseTo(0.5, 2);
  });
  it("clamps any positive rms overflow via Math.min guard", () => {
    const buf = new Uint8Array(8);
      for (let i = 0; i < 8; i++) buf[i] = 255; // ~+0.99 — saturated Uint8 sample
      const v = computeRms(buf);
      expect(v).toBeLessThanOrEqual(1);
      expect(v).toBeGreaterThan(0.9);
    });
  });

  describe("computePeak", () => {
  it("returns 0 for an empty buffer", () => {
    expect(computePeak(new Uint8Array(0))).toBe(0);
  });
  it("returns 0 for silence", () => {
    expect(computePeak(new Uint8Array(32).fill(128))).toBe(0);
  });
  it("captures the largest absolute deviation", () => {
    const buf = new Uint8Array(16).fill(128);
    buf[3] = 192; // +0.5
    buf[7] = 64;  // -0.5
    buf[12] = 216; // +0.6875
    expect(computePeak(buf)).toBeCloseTo(0.6875, 3);
  });
});

describe("stepPeakHold", () => {
  it("snaps to a new higher peak", () => {
    const prev = { peak: 0.1, capturedAt: 0 };
    const next = stepPeakHold(prev, 0.5, 1000);
    expect(next.peak).toBe(0.5);
    expect(next.capturedAt).toBe(1000);
  });
  it("keeps the old peak within the hold window", () => {
    const prev = { peak: 0.6, capturedAt: 0 };
    const next = stepPeakHold(prev, 0.2, 500); // smaller, but inside hold
    expect(next).toBe(prev);
  });
  it("decays the peak after PEAK_HOLD_MS", () => {
    const prev = { peak: 1, capturedAt: 0 };
    const after = stepPeakHold(prev, 0, PEAK_HOLD_MS + 1000);
    expect(after.peak).toBeLessThan(prev.peak);
    expect(after.peak).toBeGreaterThan(0);
  });
  it("resets to floor when decay brings it below floorDb", () => {
    const prev = { peak: 0.0001, capturedAt: 0 };
    const after = stepPeakHold(prev, 0, 60_000);
    expect(after.peak).toBe(0);
  });
});

describe("buildMeterFrame + emptyMeterFrame", () => {
  it("produces a fully-zeroed empty frame", () => {
    const f = emptyMeterFrame();
    expect(f.left).toBe(0);
    expect(f.right).toBe(0);
    expect(f.leftDb).toBe(METER_FLOOR_DB);
    expect(f.rightDb).toBe(METER_FLOOR_DB);
    expect(f.peakLeftDb).toBe(METER_FLOOR_DB);
    expect(f.peakRightDb).toBe(METER_FLOOR_DB);
  });
  it("computes rms + peak + peak-hold from analyser buffers", () => {
    const leftBuf = new Uint8Array(128);
    const rightBuf = new Uint8Array(128);
        // Round-trip a sine wave through Uint8 quantisation so we exercise the
        // same code path the real AnalyserNode feeds us. Peak amplitude after
        // quantisation is 96/128 = 0.75 for L and 32/128 = 0.25 for R.
        const peakAmp = 96 / 128;
        const rightPeakAmp = 32 / 128;
        for (let i = 0; i < 128; i++) {
          const phase = (i / 128) * 2 * Math.PI;
          const sample = Math.sin(phase);
          leftBuf[i] = Math.max(0, Math.min(255, Math.round(128 + sample * 96)));
          rightBuf[i] = Math.max(0, Math.min(255, Math.round(128 + sample * 32)));
        }
        const { frame, nextLeft, nextRight } = buildMeterFrame(
          leftBuf,
          rightBuf,
          { peak: 0, capturedAt: 0 },
          { peak: 0, capturedAt: 0 },
          10_000,
        );
        expect(frame.left).toBeGreaterThan(frame.right);
        expect(frame.leftDb).toBeGreaterThan(frame.rightDb);
        // peak holds the max amplitude observed.
        expect(frame.peakLeftDb).toBeGreaterThan(frame.leftDb);
        expect(frame.peakLeftDb).toBeCloseTo(amplitudeToDb(peakAmp), 0);
        expect(frame.peakRightDb).toBeCloseTo(amplitudeToDb(rightPeakAmp), 0);
        expect(nextLeft.peak).toBeGreaterThan(0);
        expect(nextRight.peak).toBeGreaterThan(0);
      });
});