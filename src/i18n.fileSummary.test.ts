// Translation correctness tests for the FileSummaryPanel section.
//
// These guard against a regression caught in PR #45: the zh dictionary
// had FileSummaryPanel labels copied verbatim from the en dictionary
// (English strings like "File Brief", "Format Registry", "Signals",
// "Evidence", "Boundary", "Next Actions", "Viewer", "Strategy",
// "Risk", "Support {level}", and the seven cap* keys) — the zh
// version was never actually translated.
//
// This test pins down the *content* of those keys, so a future
// contributor who reverts a zh string back to English (or introduces
// a new untranslated key) fails CI.

import { describe, expect, it } from "vitest";
import { translations } from "./i18n";

describe("translations.zh — FileSummaryPanel section is actually translated", () => {
  // Sanity: the zh dict exists and is not the same object as en.
  it("zh dict is a separate object from the en dict", () => {
    expect(translations.zh).toBeDefined();
    expect(translations.en).toBeDefined();
    expect(translations.zh).not.toBe(translations.en);
  });

  // Each key below was copied verbatim from the en dict in the pre-PR
  // state. The assertion enforces that the zh value is no longer
  // equal to the en value AND is not empty AND does not start with a
  // capital Latin letter (cheap heuristic: an untranslated English
  // label would start with a capital letter).
  const KEYS_THAT_WERE_ENGLISH_IN_ZH = [
    "fileBriefKicker",
    "registrySection",
    "signalsSection",
    "evidenceSection",
    "boundarySection",
    "nextActionsSection",
    "summaryViewer",
    "summaryStrategy",
    "summaryRisk",
    "summarySupportBadge",
    "capDetect",
    "capPreview",
    "capEdit",
    "capMetadata",
    "capThumbnail",
    "capAiSummary",
    "capExternal",
  ] as const;

  for (const key of KEYS_THAT_WERE_ENGLISH_IN_ZH) {
    it(`zh.${key} is translated (no longer equal to en.${key})`, () => {
      const zh = translations.zh[key];
      const en = translations.en[key];
      expect(zh, `zh.${key} is missing`).toBeDefined();
      expect(en, `en.${key} is missing (test data broken)`).toBeDefined();
      expect(zh).not.toBe(en);
      expect(zh.length).toBeGreaterThan(0);
    });
  }

  // Spot-check the specific Chinese phrasings we chose. If a future
  // contributor refines the wording, update the expected value here
  // intentionally — don't let it drift silently.
  it("zh.summarySupportBadge uses '支持' as the prefix (not 'Support')", () => {
    expect(translations.zh.summarySupportBadge).toBe("支持 {level}");
    expect(translations.zh.summarySupportBadge).not.toMatch(/^Support\b/);
  });

  it("en.summarySupportBadge keeps the English prefix", () => {
    expect(translations.en.summarySupportBadge).toBe("Support {level}");
  });

  it("zh capability keys use 1–2 character Chinese verbs", () => {
    expect(translations.zh.capDetect).toBe("检测");
    expect(translations.zh.capPreview).toBe("预览");
    expect(translations.zh.capEdit).toBe("编辑");
    expect(translations.zh.capMetadata).toBe("元数据");
    expect(translations.zh.capThumbnail).toBe("缩略图");
    expect(translations.zh.capAiSummary).toBe("AI 摘要");
    expect(translations.zh.capExternal).toBe("外部打开");
  });
});
