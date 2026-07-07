import { describe, expect, it } from "vitest";
import { getSupportLevel, getSupportLevelLabel } from "./supportLevels";

describe("getSupportLevel", () => {
  it("maps strong built-in viewers to full or high fidelity support", () => {
    expect(getSupportLevel("code")).toBe("full-built-in");
    expect(getSupportLevel("json")).toBe("full-built-in");
    expect(getSupportLevel("csv")).toBe("full-built-in");
    expect(getSupportLevel("image")).toBe("full-built-in");
    expect(getSupportLevel("archive")).toBe("full-built-in");
    expect(getSupportLevel("font")).toBe("full-built-in");
    expect(getSupportLevel("pdf")).toBe("high-fidelity");
  });

  it("maps approximate and semantic categories conservatively", () => {
    expect(getSupportLevel("office")).toBe("safe-approximate");
    expect(getSupportLevel("svg")).toBe("safe-approximate");
    expect(getSupportLevel("epub")).toBe("safe-approximate");
    expect(getSupportLevel("dwg")).toBe("semantic-inspection");
    expect(getSupportLevel("design")).toBe("semantic-inspection");
    expect(getSupportLevel("package")).toBe("semantic-inspection");
    expect(getSupportLevel("disk")).toBe("semantic-inspection");
  });

  it("keeps risky or incomplete categories explicit", () => {
    expect(getSupportLevel("cad")).toBe("experimental");
    expect(getSupportLevel("audio")).toBe("experimental");
    expect(getSupportLevel("video")).toBe("experimental");
    expect(getSupportLevel("other")).toBe("external-open");
  });
});

describe("getSupportLevelLabel", () => {
  it("returns Chinese product labels", () => {
    expect(getSupportLevelLabel("full-built-in")).toBe("完整内置浏览");
    expect(getSupportLevelLabel("high-fidelity")).toBe("高保真浏览");
    expect(getSupportLevelLabel("safe-approximate")).toBe("安全近似预览");
    expect(getSupportLevelLabel("semantic-inspection")).toBe("语义检查");
    expect(getSupportLevelLabel("external-open")).toBe("外部打开");
    expect(getSupportLevelLabel("experimental")).toBe("实验性");
  });
});
