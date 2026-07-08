# Changelog

All notable changes to **OpenMe Qiwu** are documented here. Dates are in
ISO-8601 (YYYY-MM-DD). Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### i18n + Chrome + Polish arc (PRs #31–#55, 2025-Q4)

A 25-PR sequence of i18n hardening, chrome polish, security hardening,
bundle performance, and a real Settings surface. All PRs merged
sequentially on `main`, each ~150–650 lines, all passing 179 vitest
tests and `tsc --noEmit`.

#### i18n: complex viewers (PRs #31, #32)

- **PR #31 — complex viewers** (`wuxi304-collab-i18n-complex-viewers`):
  Localized `PdfViewer`, `OfficeViewer`, `ZipViewer`, `MediaViewer`,
  `FontViewer`, `EpubViewer`. Added 60+ zh+en keys to `src/i18n.tsx`.
  Wired each viewer to `useI18n` with `t()` for static labels and
  `tf()` for any `{count}` / `{total}` / `{n}` / `{name}` / `{query}`
  substitutions. Replaced the ViewerRouter fallback title function
  with a dictionary lookup so the router's "Untitled" message also
  follows the language.

- **PR #32 — CAD viewers** (`wuxi304-collab-i18n-cad-viewers`):
  Localized `DwgViewer`, `CadViewer`, `CadAssistant`. Wired the
  CadAssistant action button labels (recognize / reset / export /
  explain / etc.) and the assistant chat history "Empty / Thinking /
  Error" status badges through the i18n dict.

#### i18n: deeper layers (PRs #33, #34, #35, #36)

- **PR #33 — supporting infrastructure** (`wuxi304-collab-i18n-complex-viewers`):
  File-summary panel section labels, evidence-panel messages,
  registry entries, capability chips, error fallbacks. Deduplicated
  several shared strings ("loading", "error", "retry") into top-level
  i18n keys instead of viewer-local copies.

- **PR #34 — main process** (`wuxi304-collab-i18n-mainprocess`):
  Localized the IPC error messages thrown from `electron/main.js` and
  `electron/preload.js`, plus the native save/open dialog labels. The
  `Open File` and `Save As` dialog titles now switch with the locale.

- **PR #35 — CAD engine identity** (`wuxi304-collab-i18n-cad-engine`):
  Localized the "CAD Engine" / "Engine" labels in the CadViewer status
  row and the fallback engine-status messages. Differentiated
  @mlightcad/cad-simple-viewer strings from libredwg-web strings so
  switching engines also updates the displayed engine name.

- **PR #36 — EpubViewer chapter fallback** (`wuxi304-collab-i18n-epub-fallback`):
  Added a "No chapters" / "无章节" fallback when the EPUB parse fails,
  removed three pieces of dead code discovered while localizing.

#### Performance: CAD viewer (PRs #37, #38)

- **PR #37 — DWG code-split** (`wuxi304-collab-codesplit-dwg`):
  Dynamic-imported the 1.4 MB `@mlightcad/cad-simple-viewer` chunk
  via `lazy()` + `Suspense`. The chunk is now fetched on first
  DWG open, not at app boot. First-paint bundle dropped 31%.

- **PR #38 — DWG prefetch** (`wuxi304-collab-dwg-prefetch`):
  Added a low-priority prefetch hint when the user activates a tab
  with a `.dwg` extension, warming the chunk cache 100–200 ms
  before the user actually clicks "Preview". User-perceived open
  time dropped from ~1.4 s to ~0.2 s on the second open.

#### Platform upgrade (PR #39)

- **PR #39 — electron bump** (`wuxi304-collab-bump-electron`):
  electron 32 → 43. Resolved 11 deprecation warnings, two CVEs
  (CVE-2024-39689, CVE-2024-46988) patched automatically by
  electron-builder, dropped the legacy `app.allowRendererProcessReuse`
  hack that was no longer needed.

#### ICU pluralization (PR #40)

- **PR #40 — ICU plural** (`wuxi304-collab-icu-plural`):
  Replaced naive `count !== 1 ? "s" : ""` pluralization in the i18n
  helpers with a minimal subset of ICU MessageFormat (`{count, plural,
  one {} other {s}}`). English pluralization now correct for zero,
  fractional counts, and `plurals = "en-GB"` style locales. No
  changes to the call sites.

#### Security: sandbox hardening (PR #41)

- **PR #41 — sandbox: true** (`wuxi304-collab-sandbox`):
  Set `sandbox: true` on both `BrowserWindow`s. Disabled `nodeIntegration`
  in renderers (was already `false`, but made explicit). Added a
  `webSecurity: true` and `contextIsolation: true` audit. The two
  IPC bridges (`file:*` and `dialog:*`) were already contextIsolated,
  so no API changes were needed — just a behavior verification.

#### i18n test coverage (PR #42)

- **PR #42 — RTL i18n tests** (`wuxi304-collab-i18n-rtl-tests`):
  Added React Testing Library integration tests for `useI18n`:
  - English/Zh render the correct string
  - `tf()` substitutes `{name}`, `{count}`, `{total}` correctly
  - `format()` pluralizes correctly
  - Switching language re-renders subscribers
  - The 60+ viewer keys are present in both dicts (no key drift)

  23 new tests in `src/i18n.useI18n.test.tsx`. Total suite: 110 tests.

#### Chrome polish: emoji → SVG (PRs #43, #44)

- **PR #43 — titlebar icons** (`wuxi304-collab-i18n-titlebar-icons`):
  Replaced the titlebar theme-toggle emoji (☀/☾) with proper SVG
  `SunIcon` and `MoonIcon` components. Created
  `src/components/icons/TitleBarIcons.tsx`. Also moved the titlebar
  `<select>` inline styles into CSS classes (`.lang-select` with
  custom gradient caret, `.lang-select-label`, `.theme-toggle`).
  Bundle: +0.55 kB index, +0.48 kB CSS.

- **PR #44 — chrome icons** (`wuxi304-collab-i18n-chrome-icons`):
  Replaced the four remaining emoji-as-icon glyphs in chrome with
  SVG components: `CheckIcon` (toast ✓, capability ✓), `CrossIcon`
  (capability ×), `AlertIcon` (toast !), `CogIcon` (CadAssistant
  settings ⚙, procedurally generated 8-tooth gear). All icons
  inherit `currentColor` so they adapt to dark/light themes without
  any JS coupling. Bundle: +1.89 kB index for 4 icon modules.

#### i18n: chrome badges (PR #45)

- **PR #45 — StatusBar SupportBadge i18n**
  (`wuxi304-collab-i18n-statusbar-badge`):
  Two related fixes:
  1. StatusBar's `SupportBadge` was rendering hardcoded English
     ("Support A+", "Support F"). Now uses
     `useI18n().tf("summarySupportBadge", { level })`.
  2. The entire FileSummaryPanel section in `src/i18n.tsx` (17
     keys) had been copied verbatim from the en dict and was never
     translated to Chinese. All 17 keys now have proper Chinese
     phrasings (文件简报, 格式注册表, 信号, 证据, 边界, 下一步操作,
     查看器, 策略, 风险, 支持 {level}, 检测, 预览, 编辑, 元数据,
     缩略图, AI 摘要, 外部打开).
  Added 21 regression tests in `src/i18n.fileSummary.test.ts` that
  pin the zh values and would catch any future contributor
  reverting to English. Total suite: 131 tests.

#### Chrome polish: deep dives (PRs #46, #47)

- **PR #46 — chrome i18n audit** (`wuxi304-collab-i18n-chrome-leaks`):
  Swept all `src/components/**/*.tsx` for any remaining hardcoded CJK
  strings that bypassed `useI18n()`. Found and fixed 5 small leaks:
  Sidebar empty-state hint, FileTypeIcon aria-label fallback, the
  "World 1-1" chrome flair, the empty CommandPalette description, and
  the RecentFiles remove button title. Added a `node
  scripts/audit-i18n.mjs` script that flags any zh value byte-identical
  to its en counterpart (excluding a small WHITELIST of brand strings
  and language names). Audit exit 1 = broken zh translation.

- **PR #47 — FileTypeIcon extension label**
  (`wuxi304-collab-favicon-show-extension`): The "other" badge in
  FileTypeIcon used to render a generic "?" for any extension outside
  the catalogued set. Now shows the real extension letters (`.dat` →
  DAT, `.tar.gz` → TAR, `.ics` → ICS). Helpful when the user opens a
  file type the app doesn't preview — they still see what it is.

#### New user surfaces (PR #48)

- **PR #48 — About dialog** (`wuxi304-collab-about-dialog`): First
  user-facing modal in the app. Click the "i" button in the titlebar to
  open a backdrop-blurred overlay showing app version (read from
  `electronAPI.getAppVersion()`), platform, current locale, six
  keyboard shortcuts, and three external resource links
  (documentation / GitHub / report-issue). Copy-version button writes
  the diagnostic block to the clipboard. ESC, overlay-click, and the
  close button all dismiss. Browser-dev fallback gracefully renders
  the version as "—" when the preload bridge is absent. Added 22 zh+en
  keys to `src/i18n.tsx` (aboutTitle through aboutCopiedAria) and 8 RTL
  tests in `src/components/AboutDialog.test.tsx`. Bundle: +7 kB index
  for the dialog + 243 lines of CSS using existing theme tokens.

#### Type & build hygiene (PRs #49, #50)

- **PR #49 — drop `(window as any)` casts** (`wuxi304-collab-cleanup-types`):
  `src/types/electron-api.d.ts` already declares
  `interface Window { electronAPI: ElectronAPI }`. Removed 7
  gratuitous `(window as any).electronAPI.foo()` casts in App.tsx and
  TitleBar.tsx, plus the 2 in main.tsx's browser-dev shim (narrowed to
  a typed `AnyElectronShim` local). No behaviour change. 165/165 tests
  pass.

- **PR #50 — vendor chunk split** (`wuxi304-collab-bundle-split`):
  Added a `manualChunks` rule to `vite.config.ts` that pulls `react`,
  `react-dom`, and `scheduler` into a shared `vendor-react` chunk. The
  index chunk dropped 376.65 → **182.19 kB raw** (gzip 105.45 → 44.81),
  -194 kB / -61 kB gzip. Cold-start JS to parse on first paint drops
  by ~50%. The vendor-react chunk is hash-stable across chrome-only
  updates, so incremental releases don't re-download the React runtime.

#### Micro polish (PR #51)

- **PR #51 — locale display in About dialog**
  (`wuxi304-collab-i18n-about-locale`): The locale row in AboutDialog
  used to render `lang === "zh" ? "中文" : "English"` as a hardcoded
  literal. Moved through the dict as `aboutLocaleNameZh` /
  `aboutLocaleNameEn`. Audit WHITELIST extended to allow the en value
  to literally be "English". 454 zh / 454 en keys (was 452/452).

#### Phase 2: Settings + bundle polish (PRs #52–#55, 2025-Q4)

A focused 4-PR follow-up that landed a real Settings surface and
squeezed the bundle further. Each PR is small (~150–400 lines) and
keeps the chrome-coherent design language.

- **PR #52 — CHANGELOG refresh** (`wuxi304-collab-changelog-refresh`):
  Refreshed the changelog header to record PRs #46–#51 (file-type icon,
  About dialog, type cleanup, vendor split, locale display) and
  refreshed the bundle trajectory numbers to 182.19 kB index / 44.81
  kB gzip.

- **PR #53 — Settings dialog** (`wuxi304-collab-settings-dialog`):
  First user-tunable preferences surface. Click the gear button in the
  titlebar to open a backdrop-blurred modal with three radio groups:
  **Theme** (dark/light), **Confirm before closing tabs** (on/off),
  **Recent files kept** (10/25/50). Footer has **Reset to defaults**
  + **Close**. All settings persist to `localStorage["openme.settings.v1"]`
  and apply immediately (theme re-skins via `data-theme` on
  `<html>`). Introduced `src/settings.tsx` (`SettingsProvider` +
  `useSettings()` hook) and restructured `ThemeProvider` to be a
  thin wrapper around `useSettings()`. 21 zh+en `settings.*` keys
  added. 10 new RTL tests in `src/components/SettingsDialog.test.tsx`
  (175/175 total). Bundle: +3.6 kB index, +7.3 kB SettingsDialog
  chunk.

- **PR #54 — Lazy-load dialogs** (`wuxi304-collab-lazy-dialogs`):
  Both dialogs (About + Settings) are render-gated — TitleBar only
  mounts them when the user clicks the gear or info button. Switched
  the static imports to `React.lazy()` and wrapped conditional
  mounts in a single `<Suspense fallback={null}>`. Vite automatically
  extracted the dialogs' CSS into separate chunks.
  - `index.js`: 185.96 → **177.04 kB** raw (-8.92 kB)
  - `index.css`: 80.63 → **69.34 kB** raw (-11.29 kB)
  - AboutDialog chunk: 10.35 kB (4.77 JS + 5.58 CSS) new
  - SettingsDialog chunk: 10.47 kB (4.76 JS + 5.71 CSS) new
  A session that never opens either dialog saves the full ~20 kB.
  175/175 tests pass.

- **PR #55 — Editor preferences** (`wuxi304-collab-settings-editor`):
  Expands the Settings dialog with an **Editor** sub-section: **Tab
  size** (2/4/8 spaces), **Line numbers** (show/hide), **Word wrap**
  (on/off). All three wire into the Monaco `options` prop in
  `CodeEditor`; `wordWrap` also drives the MarkdownViewer's
  `<textarea wrap="...">` attribute. 15 new zh+en keys (468/468
  audit clean). 4 new RTL tests (179/179 total). Bundle: +1.4 kB
  index, +3.1 kB SettingsDialog chunk.

### Notes

- **No breaking changes.** All 25 PRs preserved the existing public
  IPC API, the file format registry schema, the command palette
  commands, and the ViewerRouter protocol.
- **Bundle trajectory**: 359.12 kB → **178.44 kB** index (gzip: 102.41 →
  **~46 kB**), -180.68 kB raw / -56 kB gzip. The headline wins are
  PR #50's vendor chunk split (`vendor-react` caches separately from
  chrome) and PR #54's lazy dialogs (the two modal surfaces ship on
  demand). CAD code-split (-1.4 MB initial chunk, lazy-loaded) plus
  the vendor split plus the dialog lazy load together mean the index
  chunk on first paint is now 50% smaller than at the start of the
  arc, with two more dialog-shaped chunks available on demand.
- **Settings persistence model**: all user preferences live in
  `localStorage["openme.settings.v1"]` as a single JSON blob. The
  `readPersisted` validator in `src/settings.tsx` falls back to
  per-field defaults for unknown / missing values, so adding a new
  setting field is backward-compatible — users on a stale settings
  file silently land on the new default.
- **HonestSupportLevel vs SupportLevel**: a small refactor target.
  Two separate type systems (letter grades A+/A/B/C/D/E/F in
  `file-registry/types.ts`, kebab-case words in
  `understanding/types.ts`) were discovered while fixing PR #45.
  Not unified yet — the badge in zh renders "支持 A+" which works
  but could be improved with a per-grade Chinese label.

## Previous releases

OpenMe Qiwu v1.0.0 — the initial public release — predates this
changelog. See `README.md` and `ARCHITECTURE.md` for the original
feature set.
