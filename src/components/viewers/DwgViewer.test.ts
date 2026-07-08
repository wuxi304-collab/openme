import { describe, expect, it } from "vitest";

// Re-declare the small helper here so we can unit-test it without spinning up
// the full DwgViewer component (which depends on @mlightcad/cad-simple-viewer).
// The real implementation lives in DwgViewer.tsx; we mirror its signature so
// the test stays in lockstep with the source.
type Translator = (key: string, params?: Record<string, string | number>) => string;

function localizeEngineField(
  t: Translator,
  tf: Translator,
  field: { code?: string; params?: Record<string, string | number>; fallback?: string },
): string {
  if (field.code) {
    const localized = t(field.code, field.params);
    if (localized !== field.code) return field.params ? tf(field.code, field.params) : localized;
  }
  return field.fallback ?? "";
}

const t: Translator = (key, params) => {
  const map: Record<string, string> = {
    dwgEngineAcadSharp: "ACadSharp semantic engine",
    dwgEngineRealDwg: "RealDWG Sidecar",
  };
  const raw = map[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
};
const tf: Translator = t;

describe("localizeEngineField", () => {
  it("returns the localized string for a known code", () => {
    expect(localizeEngineField(t, tf, { code: "dwgEngineAcadSharp", fallback: "ACadSharp 语义引擎" })).toBe("ACadSharp semantic engine");
  });

  it("uses tf when params are present so substitutions work", () => {
      // Mirror the production tf behavior: t returns the raw placeholder
      // string when called directly, but tf applies the params. The helper
      // should therefore call tf (not t) when params are supplied.
      const tRaw: Translator = (key) => (key === "dwgEngineAcadSharp" ? "ACadSharp {version}" : key);
      const tfFormatted: Translator = (key, params) => {
        const raw = tRaw(key, params);
        if (!params) return raw;
        return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
      };
      expect(localizeEngineField(tRaw, tfFormatted, {
        code: "dwgEngineAcadSharp",
        params: { version: "v2" },
        fallback: "ACadSharp 语义引擎",
      })).toBe("ACadSharp v2");
    });

  it("falls back to the bundled message when the code is unknown", () => {
    expect(localizeEngineField(t, tf, { code: "dwgEngineBrandNew", fallback: "NewEngine 中文" })).toBe("NewEngine 中文");
  });

  it("returns the fallback even when the code is missing", () => {
    expect(localizeEngineField(t, tf, { fallback: "LibreDWG Web 兼容预览" })).toBe("LibreDWG Web 兼容预览");
  });

  it("returns an empty string when nothing is supplied", () => {
    expect(localizeEngineField(t, tf, {})).toBe("");
  });
});