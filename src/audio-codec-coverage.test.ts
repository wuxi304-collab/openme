import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const SRC = (rel: string) => resolve(ROOT, ...rel.split("/"));
const read = (rel: string) => readFileSync(SRC(rel), "utf8");

const UTIL = "src/utils/audioCodecSupport.ts";
const LL = "src/components/viewers/LosslessAudioPlayer.tsx";
const MV = "src/components/viewers/MediaViewer.tsx";
const AU = "src/components/viewers/AudioUnsupported.tsx";
const I18N = "src/i18n.tsx";
const CSS = "src/components/viewers/LosslessAudioPlayer.css";

describe("audioCodecSupport util — runtime probe", () => {
  const src = read(UTIL);

  it("exports probeAudioSupport as a Promise-returning function", () => {
    expect(src).toMatch(/export\s+function\s+probeAudioSupport/);
    expect(src).toMatch(/: Promise<AudioProbeResult>/);
  });

  it("memoises the per-filePath probe result so we don't repeat work", () => {
    expect(src).toMatch(/probeCache/);
    expect(src).toMatch(/probeCache\.get\(/);
    expect(src).toMatch(/probeCache\.set\(/);
  });

  it("creates a detached <audio> element to inspect Chromium's decode verdict", () => {
    expect(src).toMatch(/new\s+Audio\s*\(/);
    expect(src).toMatch(/audio\.addEventListener\(\s*["']loadedmetadata["']/);
    expect(src).toMatch(/audio\.addEventListener\(\s*["']error["']/);
  });

    it("attaches the probe audio to document.body so Chromium actually fetches the protocol URL", () => {
      // Without attach the probe never receives loadedmetadata for non-http
      // schemes and false-positives every supported format as unsupported.
      expect(src).toMatch(/document\.body/);
      expect(src).toMatch(/appendChild\(audio\)/);
      expect(src).toMatch(/removeChild\(audio\)/);
    });

  it("derives a stable reason key from extension + MediaError code", () => {
    expect(src).toMatch(/deriveReasonKey/);
    expect(src).toMatch(/\.dsf/);
    expect(src).toMatch(/\.dff/);
    expect(src).toMatch(/\.ape/);
    expect(src).toMatch(/\.wma/);
    expect(src).toMatch(/\.tak/);
    expect(src).toMatch(/\.wv/);
    expect(src).toMatch(/\.aif/);
    expect(src).toMatch(/MEDIA_ERR_SRC_NOT_SUPPORTED/);
  });

  it("exports a known-unsupported extensions list for callers that want fast-fail", () => {
    expect(src).toMatch(/AUDIO_PROBE_EXTS|isExtensionKnownUnsupported/);
  });

  it("bounds the probe so a stalled fetch never blocks the UI", () => {
    expect(src).toMatch(/setTimeout/);
    expect(src).toMatch(/timeoutMs/);
  });

    it("defaults the probe timeout to a snappy 2.5s rather than a sluggish 4s", () => {
      // 2500ms keeps the UI feeling responsive while still leaving room
      // for cold-cache reads. The old 4000ms caused a perceptible hang
      // before the fallback card rendered.
      expect(src).toMatch(/timeoutMs\s*\?\?\s*2500/);
    });
});

describe("LosslessAudioPlayer — codec probe wiring", () => {
  const src = read(LL);

  it("imports the probe util and stores its result", () => {
    expect(src).toMatch(/from\s+["']\.\.\/\.\.\/utils\/audioCodecSupport["']/);
    expect(src).toMatch(/const\s+\[codecProbe[,\s]/);
    expect(src).toMatch(/probeAudioSupport\(/);
  });

  it("kicks off the probe after the source URL resolves, then routes to AudioUnsupported", () => {
    // probeAudioSupport is awaited after getMediaUrl
    const probeBlock = src.match(/probeAudioSupport\([\s\S]*?setCodecProbe\(/);
    expect(probeBlock, "probe must be invoked after getMediaUrl and resolved into state").toBeTruthy();
    expect(src).toMatch(/codecProbe\?\.status\s*===\s*["']unsupported["']/);
    expect(src).toMatch(/<AudioUnsupported\b/);
  });

  it("keeps the metadata card visible while the audio element is unavailable", () => {
    // The audio src becomes undefined when the probe says unsupported so
      // Chromium stops trying to load and re-erroring. The override flag
      // gates the suppression so the user can still attempt playback after
      // dismissing the fallback card.
      expect(src).toMatch(/codecProbe\?\.status\s*===\s*["']unsupported["']\s*&&\s*!probeOverride\s*\?\s*undefined/);
    });

    it("exposes a probeOverride state so the user can force the built-in player", () => {
      expect(src).toMatch(/probeOverride/);
      expect(src).toMatch(/setProbeOverride/);
      // Override must gate both the AudioUnsupported render AND the <audio>
      // src — without both the user clicks the button and nothing changes.
      expect(src).toMatch(/!probeOverride/);
    });
});

describe("MediaViewer — codec probe wiring (simple audio deck)", () => {
  const src = read(MV);

  it("imports the probe util and stores its result for the audio branch", () => {
    expect(src).toMatch(/from\s+["']\.\.\/\.\.\/utils\/audioCodecSupport["']/);
    expect(src).toMatch(/const\s+\[codecProbe[,\s]/);
    expect(src).toMatch(/probeAudioSupport\(/);
  });

  it("only probes for kind === audio (videos use a different decoder path)", () => {
    const probeCond = src.match(/if\s*\(\s*kind\s*===\s*["']audio["']\s*\)\s*\{[\s\S]*?probeAudioSupport/);
    expect(probeCond, "probe should be gated on audio kind").toBeTruthy();
  });

  it("falls back to AudioUnsupported on detected unsupported codec", () => {
    expect(src).toMatch(/codecProbe\?\.status\s*===\s*["']unsupported["']/);
    expect(src).toMatch(/<AudioUnsupported\b/);
  });
});

describe("AudioUnsupported fallback component", () => {
  const src = read(AU);

  it("renders the localised codec reason and an open-in-system action", () => {
    expect(src).toMatch(/probe\.reasonKey\s*\?\s*t\(probe\.reasonKey\)/);
    expect(src).toMatch(/t\(["']mediaUnsupportedTitle["']\)/);
    expect(src).toMatch(/t\(["']mediaUnsupportedActionSystem["']\)/);
    expect(src).toMatch(/electronAPI\.openInSystem/);
  });

    it("passes an onTryAnyway callback through to the ViewerError secondary action", () => {
      expect(src).toMatch(/onTryAnyway/);
      expect(src).toMatch(/secondaryAction/);
      expect(src).toMatch(/mediaUnsupportedTryAnyway/);
      expect(src).toMatch(/mediaUnsupportedTryAnywayAria/);
    });

  it("uses the localised audio badge, not a literal fallback string", () => {
    // Regression guard: PR #140 originally called `t("losslessBadgeAudio")`
    // which doesn't exist, so the user saw `LOSSLESSBADGEAUDIO` literally.
    // The badge must come from the registered i18n key.
    expect(src).toMatch(/badge=\{t\(["']mediaBadgeAudio["']\)\}/);
    expect(src).not.toMatch(/losslessBadgeAudio/);
  });

  it("shows format chips so the user can confirm what they're looking at", () => {
    expect(src).toMatch(/audio-unsupported-chip/);
    expect(src).toMatch(/container\.toUpperCase\(\)/);
    expect(src).toMatch(/bitDepth/);
    expect(src).toMatch(/sampleRate/);
    expect(src).toMatch(/channels/);
  });

  it("exposes the metadata via aria-label on the chip group", () => {
    expect(src).toMatch(/aria-label=\{t\(["']audioUnsupportedMetaAria["']\)\}/);
  });
});

describe("audioCodecCoverage — i18n keys (zh + en)", () => {
  const i18n = read(I18N);

  const required = [
    "mediaUnsupportedTitle",
    "mediaUnsupportedBody",
    "mediaUnsupportedSuggestions",
    "mediaUnsupportedActionSystem",
      "mediaUnsupportedTryAnyway",
      "mediaUnsupportedTryAnywayAria",
      "mediaUnsupportedReasonDsd",
      "mediaUnsupportedReasonAlacCaf",
      "mediaUnsupportedReasonAiff",
      "mediaUnsupportedReasonApe",
      "mediaUnsupportedReasonWma",
      "mediaUnsupportedReasonTak",
      "mediaUnsupportedReasonWavpack",
      "mediaUnsupportedReasonGeneric",
      "audioUnsupportedMetaAria",
    ];

  it("every key has both zh + en strings", () => {
    for (const key of required) {
      // Two occurrences: one in the zh dict, one in the en dict.
      const matches = i18n.match(new RegExp(`\\b${key}\\s*:`, "g"));
      expect(matches, `${key} should appear twice (zh + en)`).not.toBeNull();
      expect(matches!.length, `${key} must appear twice`).toBe(2);
    }
  });

  it("zh strings are CJK and en strings use ASCII", () => {
    expect(i18n).toMatch(/mediaUnsupportedTitle:\s*"[^"]*无法[^"]*"/);
    expect(i18n).toMatch(/mediaUnsupportedTitle:\s*"Audio codec[^"]*"/);
    expect(i18n).toMatch(/mediaUnsupportedActionSystem:\s*"用系统程序播放"/);
    expect(i18n).toMatch(/mediaUnsupportedActionSystem:\s*"Open in system player"/);
  });
});

describe("audioCodecCoverage — UI styling", () => {
  const css = read(CSS);

  it("scopes the fallback card to a max width so the rest of the player stays usable", () => {
    expect(css).toMatch(/\.audio-unsupported\s*\{/);
    expect(css).toMatch(/\.audio-unsupported-chip\s*\{/);
    expect(css).toMatch(/max-width:\s*\d+px/);
  });

  it("disables transitions when prefers-reduced-motion is set", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.audio-unsupported[\s\S]*?transition:\s*none/);
  });
});
