// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import CadAssistant from "./CadAssistant";

beforeEach(() => {
  try {
    window.localStorage.setItem("openme.lang", "en");
  } catch {
    // ignore
  }
  (window as any).electronAPI = {
    getAiConfig: vi.fn().mockResolvedValue({
      configured: true,
      model: "gpt-5.4-mini",
      baseUrl: "https://api.openai.com/v1",
    }),
    saveAiConfig: vi.fn().mockResolvedValue({ success: true }),
    planCadChange: vi.fn().mockResolvedValue({
      success: true,
      plan: {
        summary: "Move text annotations to TOP layer",
        risk_level: "reversible",
        requires_confirmation: true,
        needs_clarification: false,
        clarification_question: null,
        operations: [
          {
            id: "op-1",
            action: "move_layer",
            target: "*TEXT",
            layer: "TOP",
            x: null, y: null, x2: null, y2: null,
            radius: null, angle: null, scale: null, text: null,
            reason: "User asked to consolidate text annotations.",
          },
        ],
      },
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderAssistant(props: Parameters<typeof CadAssistant>[0]) {
  return render(
    <I18nProvider>
      <CadAssistant {...props} />
    </I18nProvider>
  );
}

describe("CadAssistant polish", () => {
  it("exposes an aside landmark with role=complementary and aria-label", () => {
    renderAssistant({ filePath: "/tmp/plan.dwg", fileName: "plan.dwg" });
    expect(screen.getByRole("complementary", { name: "CAD AI assistant" })).toBeTruthy();
  });

  it("renders the question form group with aria-label", () => {
    renderAssistant({ filePath: "/tmp/plan.dwg", fileName: "plan.dwg" });
    expect(screen.getByRole("group", { name: "Question form" })).toBeTruthy();
  });

  it("renders plan region after a simulated submit, with role=region and aria-label", async () => {
    renderAssistant({ filePath: "/tmp/plan.dwg", fileName: "plan.dwg" });
    const textarea = screen.getByLabelText("What do you want to change?");
    fireEvent.change(textarea, { target: { value: "Move text annotations to TOP" } });
    const form = screen.getByRole("group", { name: "Question form" });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Modification plan" })).toBeTruthy();
    });
  });
});
