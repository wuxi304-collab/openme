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

### Phase 3: Reliability + Settings + Bundle + Chrome (PRs #56–#72)

A 17-PR continuation focused on shipping a real **error boundary**,
**cross-device settings sync**, a **richer About dialog**, **unified
viewer error states**, and a deep Settings polish. Every PR is small,
tested, and re-uses the chrome vocabulary that landed in Phase 1/2.

#### PRs #56–#59: documentation, a11y, toast dialogs, viewer errors

- **PR #56 — CHANGELOG + README refresh** (`wuxi304-collab-changelog-readme`):
  Refreshed the changelog header to record PRs #52–#55 and brought
  README's Settings table in line with the new editor-preferences PR.
- **PR #57 — a11y pass** (`wuxi304-collab-a11y`): First audit-driven
  accessibility sweep. App gains a skip-to-main-content link,
  `<main id="main-content" tabIndex={-1}>`, FileDropZone wrapped in a
  labelled `<section role="region">`, FileMetadata upgraded from a
  loose div-grid to proper `<dl>/<dt>/<dd>` semantics, RecentFiles
  gets `aria-current="true"` on the active row. Focus-visible
  outlines added to interactive elements that previously only used
  `:focus`. 9 new chrome-A11y regression tests.
- **PR #58 — themed ConfirmDialog** (`wuxi304-collab-i18n-toasts`):
  The last native `window.confirm` (still used by the "unsaved tab"
  close flow) is replaced with an in-app themed modal that
  respects the locale, dark/light theme, and ESC dismissal.
- **PR #59 — unified ViewerError** (`wuxi304-collab-viewer-error-states`):
  Ten ad-hoc error UIs across Dwg/Cad/Office/Pdf/Zip/Media/Epub/Font/
  Markdown/Csv are collapsed into a single `ViewerError` component
  with a consistent title + hint + retry button. New ViewerError.css
  chunk (~9 kB raw) and a 6-test regression suite. The chunk only
  ships when a viewer actually errors, so the happy path is
  unaffected.

#### PRs #60–#62: bundle, types, app-chrome hygiene

- **PR #60 — manualChunks split** (`wuxi304-collab-bundle-manualchunks`):
  Three new vendor chunks carved out of the lazy boundaries:
  `vendor-pdf` (365 kB / 108 kB gzip), `vendor-three` (658 kB /
  170 kB gzip), `vendor-rich-text` (59 kB / 19 kB gzip, for mammoth
  + marked). Each one is now hash-stable across chrome-only updates.
- **PR #61 — type cleanup** (`wuxi304-collab-types-cleanup`):
  Removed the remaining `(window as any).electronAPI` casts in
  `App.tsx`, `TitleBar.tsx`, and the browser-dev shim by extending
  the typed `ElectronAPI` interface in `src/types/electron-api.d.ts`.
- **PR #62 — App chrome refactor** (`wuxi304-collab-app-chrome`):
  Deduplicated the three keydown handlers in `App.tsx` (open file,
  command palette, save) into a single dispatcher keyed off
  `e.ctrlKey / e.metaKey + e.key`. Removed the remaining `: any`
  on `toast.message`. Bundle: -0.4 kB index.

#### PRs #63–#66: command palette, empty state, toast, statusbar polish

- **PR #63 — palette polish** (`wuxi304-collab-palette-polish`):
  CommandPalette now ranks recent commands by fuzzy match score and
  shows a small "5 min ago" / "yesterday" relative-time tag next to
  each recent entry. The 8-PR core algorithm in
  `src/core/commandPaletteSearch.ts` has 11 new unit tests.
- **PR #64 — empty-state polish** (`wuxi304-collab-empty-state-polish`):
  The hero empty state now includes a "Keyboard shortcuts" card
  (Cmd-O / Cmd-K / Cmd-S / drag-drop) and a "Recent files" card
  that exposes the last 5 entries with one-click open. Both cards
  use the chrome's existing card vocabulary.
- **PR #65 — toast stack** (`wuxi304-collab-toast-stack`): Toasts
  are now capped at 3 visible, with a "2 more hidden" collapse
  affordance and a per-entry TTL progress bar. Manual close button
  added; auto-dismiss timer is now 2.6 s (was 2 s).
- **PR #66 — statusbar polish** (`wuxi304-collab-statusbar-polish`):
  StatusBar now displays the active editor's line-ending (CRLF /
  LF / mixed / none) and a small theme pill ("DARK" / "LIGHT" with
  the appropriate SVG icon). A thin loading bar appears under the
  status bar while a viewer is initializing.

#### PRs #67–#69: settings sync, about upgrade, file-summary metadata

- **PR #67 — settings sync** (`wuxi304-collab-settings-sync`):
  New "Export settings" / "Import settings" buttons in the Settings
  dialog footer. Export writes a JSON file with the shape
  `{ type: "openme-settings", version: 1, settings: {...}, app: {...} }`.
  Import parses, validates, and atomically `replaceAll`s the
  SettingsContext. Wrong-shape / wrong-type / wrong-version all
  return typed errors that surface in the dialog.
- **PR #68 — About upgrade** (`wuxi304-collab-about-upgrade`):
  The About dialog now surfaces runtime info (Electron / Node /
  Chromium versions read from `navigator.userAgentData` where
  available, else `process.versions`), a 10-row acknowledgements
  table (Electron, React, Monaco, PDF.js, Three.js, Mammoth, SheetJS,
  JSZip, EPUB.js, opentype.js), and a "Copy diagnostics" button that
  writes a one-clipboard version block. 10 new RTL tests in
  `AboutDialog.runtime.test.tsx`.
- **PR #69 — file-summary metadata** (`wuxi304-collab-summary-metadata`):
  FileSummaryPanel now shows the actual file path, size, last
  modified time, SHA-1 prefix (8 hex), and a "Reveal in Explorer"
  button that calls `electronAPI.revealItem(filePath)`. New
  `FileSummaryPanel.metadata.test.tsx` with 10 tests.

#### PRs #70–#72: error boundary, sidebar, settings deep-dive

- **PR #70 — error boundary** (`wuxi304-collab-error-boundary`):
  App-level `<AppErrorBoundary>` wraps the chrome and replaces any
  thrown error with a backdrop modal: a one-click **Retry** button
  that resets state and re-renders, plus an **Open error log**
  button that downloads `openme-error-<timestamp>.log` from
  `src/utils/errorLog.ts`. The capture hook (`installErrorCapture()`)
  subscribes to `window.onerror` and `unhandledrejection` before
  React mounts, so first paint errors are recorded. 7 new RTL tests
  in `AppErrorBoundary.test.tsx`.
- **PR #71 — sidebar chrome** (`wuxi304-collab-sidebar-chrome`):
  The Sidebar empty state now has a primary "Choose file" button and
  a one-line drag hint. Recent files rows get `aria-current="true"`
  on the active file, and a decorative separator/selection dot is
  marked `aria-hidden`. 5 new tests in
  `Sidebar.emptyState.test.tsx`.
- **PR #72 — settings deep-dive** (`wuxi304-collab-settings-deep-dive`):
  Four follow-ups to the Settings dialog: the radio groups now have
  `aria-describedby` pointing at a one-line helper, a focus trap
  keeps Tab cycling inside the modal, the storage path
  (`localStorage["openme.settings.v1"]`) is shown as a
  read-only disclosure, and the reset button now requires a confirm
  step before wiping the settings blob.

### Phase 3 notes

- **Test count**: 179 → **338** (+159). New suites:
  `AppErrorBoundary`, `AboutDialog.runtime`, `CommandPalette`,
  `ConfirmDialog`, `Toast`, `StatusBar`, `Sidebar.emptyState`,
  `FileSummaryPanel.metadata`, `chromeA11y`, `SettingsDialog.sync`,
  `App.emptyState`, `ViewerError`, `commandPaletteSearch`,
  `errorLog`, `format`, `consoleWrapTest`.
- **i18n key count**: 454 / 454 → **585 / 585** zh+en, audit clean.
- **Bundle trajectory** (current build):
  - `index.js` **212.21 kB / 53.57 kB gzip**
  - `vendor-react` 194.35 kB / 60.70 kB gzip
  - `index.css` 85.12 kB / 18.37 kB gzip
  - Lazy viewer chunks: `vendor-pdf` 365.17 / 107.79,
    `vendor-three` 657.94 / 169.81, `vendor-rich-text` 59.46 /
    19.37, `occt-import-js` 59.29 / 21.22, `vendor-cad` 2,244.04 /
    627.57. None of these are loaded on first paint.
  - Dialog chunks: `AboutDialog` 10.50 / 2.75, `SettingsDialog`
    13.10 / 2.90, `ConfirmDialog` 1.60 / 0.72.
  - The `index.js` chunk grew from 178.44 → 212.21 kB raw (+33.77 kB)
    but the headline cost is the unified ViewerError + AppErrorBoundary
    retry UI; both only mount on error. The vendor split now means
    chrome-only updates ship ~30 kB of JS, not the full 200 kB.
- **Settings file shape**: PR #67 introduces
  `serializeSettings(settings, appMeta): SettingsFile` and
  `parseSettingsFile(raw): SettingsImportResult`. The `type` discriminator
  is `"openme-settings"` and `version` is `1`. Importing a different
  `type` or `version` returns a typed failure reason
  (`"invalid-json"` | `"wrong-shape"`) that the dialog surfaces.
- **Error capture**: PR #70 adds `installErrorCapture()` (called
  from a `useEffect` in `App` that runs before any other effect).
  Captures `window.onerror` and `unhandledrejection`, writes a
  per-session ring buffer of `{ timestamp, message, source, line,
  stack }`, and exposes a `downloadErrorLog()` button in the
  error boundary modal. The buffer is intentionally small (100
  entries) and never persisted across sessions.
- **Open PRs**: `#24 feat/viewer-matrix` and `#26 feat/action-plan-ui`
  are intentionally left open — they predate this phase and the
  matrix / action plan layers have since been re-architected into
  `src/viewer-matrix/` and the right-side FileSummaryPanel. Those
  branches will be re-scoped against the current main rather than
  rebased through 95+ commits of UI churn.

## Previous releases

OpenMe Qiwu v1.0.0 — the initial public release — predates this
changelog. See `README.md` and `ARCHITECTURE.md` for the original
feature set.
