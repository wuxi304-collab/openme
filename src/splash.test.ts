import { describe, it, expect } from "vitest";
import { translations } from "./i18n";

const SPLASH_KEYS = [
  "splashTitle",
  "splashTagline",
  "splashPhaseBoot",
  "splashPhaseRenderer",
  "splashPhaseAssets",
  "splashPhaseReady",
  "splashVersion",
  "splashHint",
  "aboutPublisherName",
];

describe("splash i18n keys", () => {
  it.each(SPLASH_KEYS)("%s exists in zh and is non-empty", (key) => {
    expect(translations.zh[key]).toBeTruthy();
    expect(typeof translations.zh[key]).toBe("string");
  });

  it.each(SPLASH_KEYS)("%s exists in en and is non-empty", (key) => {
    expect(translations.en[key]).toBeTruthy();
    expect(typeof translations.en[key]).toBe("string");
  });

  it("splashVersion contains a {version} placeholder", () => {
    expect(translations.zh.splashVersion).toContain("{version}");
    expect(translations.en.splashVersion).toContain("{version}");
  });

  it("phase labels are distinct (boot != renderer != assets != ready)", () => {
    const phases = [
      "splashPhaseBoot",
      "splashPhaseRenderer",
      "splashPhaseAssets",
      "splashPhaseReady",
    ];
    for (const lang of ["zh", "en"] as const) {
      const labels = phases.map((p) => translations[lang][p]);
      const set = new Set(labels);
      expect(set.size).toBe(phases.length);
    }
  });
});