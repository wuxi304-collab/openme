# OpenMe Roadmap

OpenMe is a local-first, general-purpose file workspace. Its core should stay industry-neutral. Domain-specific intelligence belongs in optional packs.

The long-term shape is:

```text
OpenMe Core
  -> Format Viewers
  -> File Understanding Layer
  -> Domain Packs
```

## Product Principles

1. **General first**: OpenMe should be useful before any industry pack is installed.
2. **Local first**: Files are not uploaded by default. Cloud or AI features must be explicit.
3. **Honest compatibility**: Native, approximate, semantic, and external-open support must be clearly separated.
4. **Viewers and packs are separate**: A viewer opens or previews a file. A pack understands or acts on it.
5. **No silent mutation**: Source files, especially engineering and business files, must not be overwritten without a user-confirmed save/copy workflow.

## V0.1 — Trustworthy General Workspace

Goal: make OpenMe reliable enough for public testing.

Scope:

- Windows desktop build
- Multi-file open and drag-and-drop
- Recent files
- Multi-tab workspace
- Command palette and keyboard navigation
- Local-first safety statements
- Support matrix with explicit support levels
- Basic viewers for documents, data, images, archives, media, fonts, EPUB, code, and engineering files
- Clear fallback to system apps when built-in preview is not reliable
- GitHub issue templates for bugs, format requests, and pack requests

Non-goals:

- Account system
- Cloud sync
- Auto-updating marketplace
- AutoCAD-level embedded DWG fidelity
- AI-driven source-file mutation

## V0.2 — Project Workspace

Goal: move from opening individual files to organizing a set of related files.

Scope:

- Project Basket / Workspace concept
- Add multiple files into a named workspace
- Workspace-level file list and format summary
- Notes, tags, and file grouping
- Export workspace summary as Markdown
- Preserve all files locally; do not duplicate large files unless explicitly requested

Example use cases:

- Bid package review
- Customer inquiry package
- Design asset package
- Contract attachment package
- Research reading package
- Engineering drawing package

## V0.3 — File Understanding Layer

Goal: generate neutral summaries and metadata without binding OpenMe to one industry.

Scope:

- PDF: page count, text availability, title signals, keyword extraction
- Excel/CSV: sheet count, row/column scale, header detection, possible amount/date/spec columns
- Word/Markdown/Text: heading, table, paragraph, and keyword summary
- ZIP: file tree, type distribution, safety checks
- Images: dimensions, format, transparency, EXIF when available
- CAD/DWG/DXF: layers, blocks, entity counts, text extraction, engine-quality warning
- Code: language, file structure, dependency hints

Output:

- Per-file summary cards
- Workspace summary cards
- Exportable evidence report

## V0.4 — Domain Pack System

Goal: allow domain intelligence without polluting the core application.

Planned pack structure:

```text
packs/
  metal/
    manifest.json
    extractors/
    rules/
    prompts/
    views/
    samples/
  engineering/
  finance/
  legal/
  research/
  developer/
```

Each pack should define:

- Name, version, supported file types, and permissions
- Extractors for domain fields
- Rules for validation and warnings
- Optional prompts for AI-assisted workflows
- Optional custom summary cards
- Sample files or fixtures for regression testing

## V0.5 — First Domain Packs

Initial candidate packs:

### Engineering Pack

- CAD layer/block/entity/text summary
- External native CAD launcher detection
- Drawing review checklist
- Safe modification-plan workflow

### Metal Materials Pack

- Material grade extraction
- Specification and dimension extraction
- Standard resolver
- Quantity/unit detection
- Quotation field extraction
- Missing-information warnings

The stainless steel workflow should live inside the Metal Materials Pack as the first deep vertical sample, not as the identity of OpenMe itself.

### Finance Pack

- Invoice/statement recognition
- Amount/date/currency extraction
- Table sanity checks

### Legal Pack

- Contract metadata
- Parties, obligations, dates, termination clauses
- Clause-level review checklist

### Research Pack

- Paper metadata
- Notes and citation extraction
- Reading summaries

### Developer Pack

- Source tree overview
- Dependency and config detection
- README/package/script summary

## V1.0 — Stable Platform Release

Goal: make OpenMe feel like a dependable local file command center.

Scope:

- Stable Windows release package
- Regression sample suite
- Automated build checks
- Pack registry foundation
- User-facing support matrix
- Versioned release notes
- Pack-level enable/disable controls
- Clear privacy model for local, external, and AI-assisted actions
