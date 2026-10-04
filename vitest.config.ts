import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Per-file `// @vitest-environment jsdom` directive can opt in to a DOM
    // environment (used by the i18n.useI18n integration test). All other
    // tests run in the default node environment.
    environment: "node",
    // `scripts/` is included deliberately: the repo has contract tests for the
    // build/i18n scripts, and leaving them out of `include` means they never run
    // at all — not locally, not in CI, which runs the same `npm test`. A test
    // that never executes is worse than no test, because it reads as coverage.
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,tsx}"],
    globals: false,
  },
});
