import { describe, expect, it } from "vitest";
import { format, formatIcu } from "./i18n";

describe("formatIcu — simple {key} substitution (backward compat)", () => {
  it("returns the template unchanged when no params are passed", () => {
    expect(formatIcu("Hello {name}")).toBe("Hello {name}");
  });

  it("substitutes a single {key}", () => {
    expect(formatIcu("Hello {name}", { name: "Alice" })).toBe("Hello Alice");
  });

  it("substitutes multiple {key} placeholders in one template", () => {
    expect(
      formatIcu("{shown} / {total} items", { shown: 3, total: 5 }),
    ).toBe("3 / 5 items");
  });

  it("coerces numeric values to strings", () => {
    expect(formatIcu("count = {n}", { n: 0 })).toBe("count = 0");
  });

  it("leaves missing keys as their original {key} token (no crash)", () => {
    expect(formatIcu("Hi {name} ({missing})", { name: "Bob" })).toBe(
      "Hi Bob ({missing})",
    );
  });

  it("does not consume `{}` (empty braces are not a placeholder)", () => {
    expect(formatIcu("curly {} {name}", { name: "X" })).toBe("curly {} X");
  });
});

describe("formatIcu — ICU plural, English", () => {
  it("selects `one` for n === 1", () => {
    expect(
      formatIcu(
        "{count, plural, one {# vertex} other {# vertices}}",
        { count: 1 },
        "en",
      ),
    ).toBe("1 vertex");
  });

  it("selects `other` for n === 0", () => {
    expect(
      formatIcu(
        "{count, plural, one {# vertex} other {# vertices}}",
        { count: 0 },
        "en",
      ),
    ).toBe("0 vertices");
  });

  it("selects `other` for n === 2", () => {
    expect(
      formatIcu(
        "{count, plural, one {# vertex} other {# vertices}}",
        { count: 2 },
        "en",
      ),
    ).toBe("2 vertices");
  });

  it("substitutes `#` for the number inside plural branches", () => {
    expect(
      formatIcu(
        "{count, plural, one {Found # match} other {Found # matches}}",
        { count: 1 },
        "en",
      ),
    ).toBe("Found 1 match");
  });

  it("falls back to `other` when the `one` branch is absent", () => {
    expect(
      formatIcu(
        "{count, plural, other {# items only}}",
        { count: 1 },
        "en",
      ),
    ).toBe("1 items only");
  });

  it("handles two independent plural expressions in one template", () => {
    expect(
      formatIcu(
        "{files, plural, one {# file} other {# files}} / {dirs, plural, one {# folder} other {# folders}}",
        { files: 1, dirs: 0 },
        "en",
      ),
    ).toBe("1 file / 0 folders");
  });

  it("handles mixed plural + plain {key} placeholders", () => {
    expect(
      formatIcu(
        "{name}: {count, plural, one {# vertex} other {# vertices}}",
        { name: "mesh", count: 3 },
        "en",
      ),
    ).toBe("mesh: 3 vertices");
  });
});

describe("formatIcu — ICU plural, Chinese", () => {
  it("always selects the `other` branch (no grammatical plural)", () => {
    expect(
      formatIcu(
        "{count, plural, one {# vertex} other {# vertices}}",
        { count: 1 },
        "zh",
      ),
    ).toBe("1 vertices");
  });

  it("renders the `other` branch even when `one` exists", () => {
    // Chinese never uses "one" even at n=1; the `one` branch is included
    // only so the same source string is reusable for both languages.
    expect(
      formatIcu(
        "{count, plural, one {# 顶点} other {# 顶点}}",
        { count: 1 },
        "zh",
      ),
    ).toBe("1 顶点");
  });
});

describe("formatIcu — live dictionary keys (regression coverage)", () => {
  it("csvErrors: en plural sensitivity", () => {
    const en = "{count, plural, one {# format issue} other {# format issues}}";
    expect(formatIcu(en, { count: 1 }, "en")).toBe("1 format issue");
    expect(formatIcu(en, { count: 2 }, "en")).toBe("2 format issues");
    expect(formatIcu(en, { count: 0 }, "en")).toBe("0 format issues");
  });

  it("cad3dMeshes: en singular/plural", () => {
    const en = "{count, plural, one {# mesh} other {# meshes}}";
    expect(formatIcu(en, { count: 1 }, "en")).toBe("1 mesh");
    expect(formatIcu(en, { count: 42 }, "en")).toBe("42 meshes");
  });

  it("pdfMatchCount: en singular/plural", () => {
    const en = "{count, plural, one {# match} other {# matches}}";
    expect(formatIcu(en, { count: 1 }, "en")).toBe("1 match");
    expect(formatIcu(en, { count: 5 }, "en")).toBe("5 matches");
  });

  it("zipCount: en compound plural", () => {
    const en = "{files, plural, one {# file} other {# files}} / {dirs, plural, one {# folder} other {# folders}}";
    expect(formatIcu(en, { files: 1, dirs: 1 }, "en")).toBe(
      "1 file / 1 folder",
    );
    expect(formatIcu(en, { files: 3, dirs: 2 }, "en")).toBe(
      "3 files / 2 folders",
    );
  });

  it("cmdTabCountDetail: en singular/plural", () => {
    const en = "{count, plural, one {# open tab} other {# open tabs}}";
    expect(formatIcu(en, { count: 1 }, "en")).toBe("1 open tab");
    expect(formatIcu(en, { count: 7 }, "en")).toBe("7 open tabs");
  });
});

describe("format — backward-compat shim", () => {
  it("treats the default lang as zh (so plural uses the other branch)", () => {
    // The legacy `format` always assumed zh, which has no plural form.
    expect(
      format("{count, plural, one {# vertex} other {# vertices}}", {
        count: 1,
      }),
    ).toBe("1 vertices");
  });
});
