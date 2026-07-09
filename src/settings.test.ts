// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULTS, parseSettingsFile, serializeSettings, SETTINGS_FILE_TYPE, SETTINGS_FILE_VERSION, type Settings } from "./settings";

const SAMPLE: Settings = {
  theme: "light",
  confirmTabClose: false,
  recentLimit: 25,
  tabSize: 2,
  lineNumbers: "off",
  wordWrap: "on",
};

describe("settings sync serialization", () => {
  it("serializes current settings to a versioned file payload", () => {
    const payload = serializeSettings(SAMPLE, { name: "OpenMe Qiwu", version: "1.0.0" });
    expect(payload.type).toBe(SETTINGS_FILE_TYPE);
    expect(payload.version).toBe(SETTINGS_FILE_VERSION);
    expect(payload.app).toEqual({ name: "OpenMe Qiwu", version: "1.0.0" });
    expect(payload.settings).toEqual(SAMPLE);
    expect(typeof payload.exportedAt).toBe("string");
    expect(new Date(payload.exportedAt).toString()).not.toBe("Invalid Date");
  });

  it("round-trips through parseSettingsFile", () => {
    const payload = serializeSettings(SAMPLE, { name: "OpenMe Qiwu", version: "1.0.0" });
    const result = parseSettingsFile(payload);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings).toEqual(SAMPLE);
  });

  it("rejects payloads with the wrong type marker", () => {
    const result = parseSettingsFile({ type: "evil", version: SETTINGS_FILE_VERSION, settings: SAMPLE });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("wrong-shape");
  });

  it("rejects payloads with a different version", () => {
    const result = parseSettingsFile({ type: SETTINGS_FILE_TYPE, version: 99, settings: SAMPLE });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("wrong-shape");
  });

  it("rejects non-object payloads", () => {
    expect(parseSettingsFile(null).ok).toBe(false);
    expect(parseSettingsFile("string").ok).toBe(false);
    expect(parseSettingsFile(42).ok).toBe(false);
  });

  it("falls back to defaults for missing or invalid keys (partial file)", () => {
    const result = parseSettingsFile({ type: SETTINGS_FILE_TYPE, version: SETTINGS_FILE_VERSION, settings: { theme: "light" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.theme).toBe("light");
      expect(result.settings.tabSize).toBe(DEFAULTS.tabSize);
      expect(result.settings.confirmTabClose).toBe(DEFAULTS.confirmTabClose);
      expect(result.settings.lineNumbers).toBe(DEFAULTS.lineNumbers);
      expect(result.settings.wordWrap).toBe(DEFAULTS.wordWrap);
    }
  });

  it("treats unknown enum values as the default", () => {
    const result = parseSettingsFile({
      type: SETTINGS_FILE_TYPE,
      version: SETTINGS_FILE_VERSION,
      settings: { tabSize: 7, recentLimit: 7, theme: "neon", lineNumbers: "maybe", wordWrap: "perhaps" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.tabSize).toBe(DEFAULTS.tabSize);
      expect(result.settings.recentLimit).toBe(DEFAULTS.recentLimit);
      expect(result.settings.theme).toBe(DEFAULTS.theme);
      expect(result.settings.lineNumbers).toBe(DEFAULTS.lineNumbers);
      expect(result.settings.wordWrap).toBe(DEFAULTS.wordWrap);
    }
  });
});
