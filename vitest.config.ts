import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Per-file `// @vitest-environment jsdom` directive can opt in to a DOM
    // environment (used by the i18n.useI18n integration test). All other
    // tests run in the default node environment.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
  },
});
