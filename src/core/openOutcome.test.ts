import { describe, expect, it } from "vitest";
import type { FileOpenOutcome } from "../types";

describe("file open outcome", () => {
  it("stores the OpenMe tab surface contract", () => {
    const outcome: FileOpenOutcome = {
      surface: "openme-tab",
      status: "loaded",
      loader: "text",
      routeMode: "text",
      message: "Opened in OpenMe",
    };

    expect(outcome.surface).toBe("openme-tab");
    expect(outcome.status).toBe("loaded");
  });
});
