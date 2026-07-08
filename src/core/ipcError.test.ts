import { describe, expect, it } from "vitest";
import { describeIpcError, isIpcFailure } from "./ipcError";
import type { Translator } from "../i18n";

const t: Translator = (key, params) => {
  const map: Record<string, string> = {
    FILE_TOO_LARGE: "File too large ({sizeMb} MB)",
    ZIP_TOO_MANY_FILES: "Archive has too many entries",
    ipcUnknownError: "Unknown error",
  };
  const raw = map[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
};

describe("describeIpcError", () => {
  it("resolves a known error code through the translator with params", () => {
    const message = describeIpcError(t, { success: false, code: "FILE_TOO_LARGE", params: { sizeMb: 42 }, message: "fallback" });
    expect(message).toBe("File too large (42 MB)");
  });

  it("falls back to the bundled message when the translator returns the key unchanged", () => {
    const message = describeIpcError(t, { success: false, code: "UNKNOWN_CODE", params: {}, message: "Bundled 中文 fallback" });
    expect(message).toBe("Bundled 中文 fallback");
  });

  it("falls back to ipcUnknownError when given null/undefined", () => {
    expect(describeIpcError(t, null)).toBe("Unknown error");
    expect(describeIpcError(t, undefined)).toBe("Unknown error");
  });

  it("falls back to ipcUnknownError when the failure has no code and no message", () => {
    expect(describeIpcError(t, { success: false } as never)).toBe("Unknown error");
  });
});

describe("isIpcFailure", () => {
  it("identifies the { success: false, code } shape", () => {
    expect(isIpcFailure({ success: false, code: "X" })).toBe(true);
    expect(isIpcFailure({ success: true, code: "X" })).toBe(false);
    expect(isIpcFailure(null)).toBe(false);
    expect(isIpcFailure(undefined)).toBe(false);
    expect(isIpcFailure({ code: "X" })).toBe(false);
  });
});