import { describe, expect, it } from "vitest";
import {
  formatBitDepth,
  formatBitrate,
  formatChannels,
  formatDuration,
  formatRemaining,
  formatSampleRate,
  getQualityTier,
  isLosslessExtension,
  trackDisplayName,
} from "./audioFormat";

describe("isLosslessExtension", () => {
  it("accepts canonical lossless extensions with leading dot", () => {
    expect(isLosslessExtension(".flac")).toBe(true);
    expect(isLosslessExtension(".wav")).toBe(true);
    expect(isLosslessExtension(".aif")).toBe(true);
    expect(isLosslessExtension(".aiff")).toBe(true);
    expect(isLosslessExtension(".dsf")).toBe(true);
    expect(isLosslessExtension(".dff")).toBe(true);
  });

  it("accepts full paths and uses the extension", () => {
    expect(isLosslessExtension("/music/track.flac")).toBe(true);
    expect(isLosslessExtension("C:\\songs\\song.wav")).toBe(true);
    expect(isLosslessExtension("Track.AIFF")).toBe(true);
  });

  it("rejects lossy and unknown formats", () => {
    expect(isLosslessExtension(".mp3")).toBe(false);
    expect(isLosslessExtension(".aac")).toBe(false);
    expect(isLosslessExtension(".ogg")).toBe(false);
    expect(isLosslessExtension(".opus")).toBe(false);
    expect(isLosslessExtension(".m4a")).toBe(false);
    expect(isLosslessExtension(".txt")).toBe(false);
  });
});

describe("getQualityTier", () => {
  it("returns lossy when explicitly false", () => {
    expect(getQualityTier({ lossless: false })).toBe("lossy");
    expect(getQualityTier({ lossless: false, sampleRate: 96000, bitsPerSample: 24 })).toBe("lossy");
  });

  it("classifies hi-res: ≥24-bit OR >48 kHz", () => {
    expect(getQualityTier({ lossless: true, bitsPerSample: 24, sampleRate: 96000 })).toBe("hi-res");
    expect(getQualityTier({ lossless: true, bitsPerSample: 16, sampleRate: 96000 })).toBe("hi-res");
    expect(getQualityTier({ lossless: true, bitsPerSample: 32, sampleRate: 44100 })).toBe("hi-res");
    expect(getQualityTier({ lossless: true, bitsPerSample: 24, sampleRate: 192000 })).toBe("hi-res");
  });

  it("classifies lossless-cd: 16-bit / 44.1 or 48 kHz", () => {
    expect(getQualityTier({ lossless: true, bitsPerSample: 16, sampleRate: 44100 })).toBe("lossless-cd");
    expect(getQualityTier({ lossless: true, bitsPerSample: 16, sampleRate: 48000 })).toBe("lossless-cd");
  });

  it("classifies generic lossless when bit-depth or rate is missing", () => {
    expect(getQualityTier({ lossless: true, sampleRate: 22050, bitsPerSample: 16 })).toBe("lossless");
    expect(getQualityTier({ lossless: true })).toBe("lossless");
  });

  it("falls back to lossless when library couldn't determine", () => {
    expect(getQualityTier({ lossless: null, sampleRate: 44100 })).toBe("lossless");
  });

  it("returns lossy for null/empty input", () => {
    expect(getQualityTier(null)).toBe("lossy");
    expect(getQualityTier(undefined)).toBe("lossy");
  });
});

describe("formatSampleRate", () => {
  it("formats standard rates", () => {
    expect(formatSampleRate(44100)).toBe("44.1 kHz");
    expect(formatSampleRate(48000)).toBe("48 kHz");
    expect(formatSampleRate(96000)).toBe("96 kHz");
    expect(formatSampleRate(192000)).toBe("192 kHz");
  });

  it("formats integer kHz with no decimals when divisible by 1000", () => {
    expect(formatSampleRate(48000)).toBe("48 kHz");
    expect(formatSampleRate(96000)).toBe("96 kHz");
  });

  it("handles unknown / null / 0 / NaN", () => {
    expect(formatSampleRate(0)).toBe("—");
    expect(formatSampleRate(null)).toBe("—");
    expect(formatSampleRate(undefined)).toBe("—");
    expect(formatSampleRate(NaN)).toBe("—");
  });
});

describe("formatBitDepth", () => {
  it("formats valid bit depths", () => {
    expect(formatBitDepth(16)).toBe("16-bit");
    expect(formatBitDepth(24)).toBe("24-bit");
    expect(formatBitDepth(32)).toBe("32-bit");
  });

  it("returns dash for invalid inputs", () => {
    expect(formatBitDepth(0)).toBe("—");
    expect(formatBitDepth(null)).toBe("—");
    expect(formatBitDepth(undefined)).toBe("—");
  });
});

describe("formatBitrate", () => {
  it("formats kbps below 1000", () => {
    expect(formatBitrate(320)).toBe("320 kbps");
    expect(formatBitrate(999)).toBe("999 kbps");
  });

  it("formats Mbps above 1000", () => {
    expect(formatBitrate(1411)).toBe("1.41 Mbps");
    expect(formatBitrate(1411.2)).toBe("1.41 Mbps");
    expect(formatBitrate(9216)).toBe("9.22 Mbps");
  });

  it("handles invalid inputs", () => {
    expect(formatBitrate(0)).toBe("—");
    expect(formatBitrate(null)).toBe("—");
    expect(formatBitrate(NaN)).toBe("—");
  });
});

describe("formatChannels", () => {
  it("maps common channel layouts", () => {
    expect(formatChannels(1)).toBe("1 ch (Mono)");
    expect(formatChannels(2)).toBe("2 ch (Stereo)");
    expect(formatChannels(6)).toBe("5.1 Surround");
    expect(formatChannels(8)).toBe("7.1 Surround");
  });

  it("falls back to generic 'N ch (Surround)' for unusual counts", () => {
    expect(formatChannels(4)).toBe("4 ch (Surround)");
    expect(formatChannels(12)).toBe("12 ch (Surround)");
  });

  it("handles invalid inputs", () => {
    expect(formatChannels(0)).toBe("—");
    expect(formatChannels(null)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("formats seconds to mm:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(59)).toBe("0:59");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("pads minutes under an hour to one digit, hours to two", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(7325)).toBe("2:02:05");
  });

  it("handles invalid inputs", () => {
    expect(formatDuration(null)).toBe("0:00");
    expect(formatDuration(undefined)).toBe("0:00");
    expect(formatDuration(NaN)).toBe("0:00");
    expect(formatDuration(-1)).toBe("0:00");
  });

  it("rounds down partial seconds", () => {
    expect(formatDuration(59.9)).toBe("0:59");
  });
});

describe("formatRemaining", () => {
  it("returns minus-prefixed duration", () => {
    expect(formatRemaining(0, 100)).toBe("-1:40");
    expect(formatRemaining(30, 90)).toBe("-1:00");
  });

  it("clamps to zero when current exceeds total", () => {
    expect(formatRemaining(120, 100)).toBe("-0:00");
  });

  it("handles unknown total", () => {
    expect(formatRemaining(0, null)).toBe("0:00");
    expect(formatRemaining(0, undefined)).toBe("0:00");
  });
});

describe("trackDisplayName", () => {
  it("prefers the fallback title when provided", () => {
    expect(trackDisplayName("/music/01-track.flac", "Song Title")).toBe("Song Title");
    expect(trackDisplayName("/music/track.flac", "  Padded  ")).toBe("Padded");
  });

  it("falls back to basename without extension when no title", () => {
    expect(trackDisplayName("/music/Album/track.flac")).toBe("track");
    expect(trackDisplayName("C:\\songs\\song.wav")).toBe("song");
  });

  it("handles paths with multiple dots in filename", () => {
    expect(trackDisplayName("/music/01. beat.flac")).toBe("01. beat");
  });

  it("handles paths without separators", () => {
    expect(trackDisplayName("track.flac")).toBe("track");
  });
});
