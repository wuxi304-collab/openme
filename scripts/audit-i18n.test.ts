// Smoke test for scripts/audit-i18n.mjs. The audit script reads
// src/i18n.tsx, extracts the zh and en dicts, and reports any zh
// entry that is byte-identical to the en entry (a strong signal of
// an untranslated key). This test runs the script as a child process
// and verifies:
//   - the audit passes on the real i18n.tsx (positive case)
//   - the audit catches a synthetic duplicate zh entry (negative case)
//
// For the negative case we create a minimal fake i18n.tsx in a temp
// directory with the expected relative layout, then run the script
// from that temp root.

import { describe, expect, it, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "audit-i18n.mjs");
const REAL_I18N = path.join(__dirname, "..", "src", "i18n.tsx");
const REAL_ROOT = path.join(__dirname, "..");
const TMP_ROOT = path.join(REAL_ROOT, "node_modules", ".audit-i18n-tmp");

function runAuditFromRoot(root: string) {
  return spawnSync("node", [SCRIPT], { cwd: root });
}

const MINIMAL_DUPLICATE = `import React, { createContext, useContext, useEffect, useState } from "react";
export const translations: Record<string, Record<string, string>> = {
  zh: {
    appName: "File workspace",
    goodGreeting: "Welcome to OpenMe",
  },
  en: {
    appName: "File workspace",
    goodGreeting: "Welcome to OpenMe",
  },
};
export const t = (key: string) => key;
export const tf = (key: string, _p?: any) => key;
`;

describe("audit-i18n.mjs", () => {
  afterAll(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  it("passes on the real i18n.tsx (no untranslated zh entries)", () => {
    const result = runAuditFromRoot(REAL_ROOT);
    expect(result.status).toBe(0);
    const out = (result.stdout?.toString() ?? "") + (result.stderr?.toString() ?? "");
    expect(out).toMatch(/i18n audit clean/);
    // Sanity: the audit must enumerate both dicts.
    expect(out).toMatch(/zh keys/);
  });

  it("fails on a fake i18n.tsx with two identical zh entries", () => {
    fs.mkdirSync(path.join(TMP_ROOT, "src"), { recursive: true });
    fs.writeFileSync(path.join(TMP_ROOT, "src", "i18n.tsx"), MINIMAL_DUPLICATE);
    const result = runAuditFromRoot(TMP_ROOT);
    expect(result.status).toBe(1);
    const out = (result.stdout?.toString() ?? "") + (result.stderr?.toString() ?? "");
    expect(out).toMatch(/appName/);
    expect(out).toMatch(/goodGreeting/);
  });
});
