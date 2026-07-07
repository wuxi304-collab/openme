import { describe, expect, it } from "vitest";
import { buildFileBrief } from "../brief";
import { extractMetadata } from "../metadata";
import { createOpenActionPlan } from "./createOpenActionPlan";

describe("open action planner", () => {
  it("uses the internal preview path for built-in preview formats", () => {
    const brief = buildFileBrief(extractMetadata({ filePath: "C:/work/spec.pdf", fileName: "spec.pdf" }));
    const plan = createOpenActionPlan(brief);

    expect(plan.kind).toBe("preview");
    expect(plan.canUseInternalViewer).toBe(true);
    expect(plan.requiresConfirmation).toBe(false);
    expect(plan.primaryLabel).toBe("Open preview");
  });

  it("keeps text files on the text-preview path", () => {
    const brief = buildFileBrief(extractMetadata({ filePath: "C:/work/readme.md", fileName: "readme.md", textSample: "# Title" }));
    const plan = createOpenActionPlan(brief);

    expect(plan.kind).toBe("text-preview");
    expect(plan.canUseInternalViewer).toBe(true);
    expect(plan.primaryLabel).toBe("Open text preview");
  });

  it("requires confirmation for high-risk restricted families", () => {
    const brief = buildFileBrief(extractMetadata({ filePath: "C:/downloads/setup.exe", fileName: "setup.exe" }));
    const plan = createOpenActionPlan(brief);

    expect(plan.kind).toBe("blocked");
    expect(plan.risk).toBe("high");
    expect(plan.canUseInternalViewer).toBe(false);
    expect(plan.requiresConfirmation).toBe(true);
  });

  it("routes unknown formats to handoff without internal viewing", () => {
    const brief = buildFileBrief(extractMetadata({ filePath: "C:/work/file.unknownx", fileName: "file.unknownx" }));
    const plan = createOpenActionPlan(brief);

    expect(plan.kind).toBe("handoff");
    expect(plan.canUseInternalViewer).toBe(false);
    expect(plan.primaryLabel).toBe("Open externally");
  });
});
