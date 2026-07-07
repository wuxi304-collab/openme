# OpenMe Architecture

OpenMe should evolve as a platform, not as a single-purpose vertical application.

The central rule is:

```text
Viewer = opens or previews a file
Pack = understands or acts on a file
Core = coordinates files, windows, safety, workspace state, commands, and extension points
```

## Layered Model

```text
OpenMe Core
  ├─ File System Boundary
  ├─ Security Boundary
  ├─ Workspace State
  ├─ Command System
  ├─ Recent Files
  ├─ Project Workspaces
  └─ Pack Registry

Format Viewers
  ├─ Document Viewers
  ├─ Data Viewers
  ├─ Image Viewers
  ├─ Archive Viewers
  ├─ Media Viewers
  ├─ Font Viewers
  ├─ EPUB Viewer
  ├─ Code Viewer
  └─ Engineering Viewers

File Understanding Layer
  ├─ Metadata Extractors
  ├─ Summary Builders
  ├─ Safety Checks
  └─ Evidence Reports

Domain Packs
  ├─ Engineering Pack
  ├─ Metal Materials Pack
  ├─ Finance Pack
  ├─ Legal Pack
  ├─ Research Pack
  └─ Developer Pack
```

## Core Responsibilities

The core must remain industry-neutral.

It owns:

- Window lifecycle
- File open dialogs and drag-and-drop
- Recent files
- Tabs
- Command palette
- Save and dirty-state protection
- Safe file-system IPC
- Workspace/project state
- Viewer selection
- Pack discovery and execution boundaries
- Privacy and permission prompts

It must not contain hard-coded business logic for one industry.

## Viewer Responsibilities

A viewer is responsible for representing a format honestly.

Examples:

- PDF viewer renders pages and extracts text when possible.
- CSV viewer shows tabular rows, search, sort, and pagination.
- ZIP viewer lists entries and guards extraction.
- CAD viewer provides engineering preview or semantic preview, but does not claim native CAD fidelity when the engine cannot provide it.

Viewer outputs should be reusable by the understanding layer:

```ts
interface ViewerCapability {
  format: string;
  supportLevel: "native" | "high-fidelity" | "approximate" | "semantic" | "external" | "unsupported";
  canExtractText?: boolean;
  canExtractTables?: boolean;
  canExtractMetadata?: boolean;
  canRenderPreview?: boolean;
}
```

## File Understanding Layer

This layer produces neutral, non-industry summaries.

Examples:

- File size, path, extension, modified time
- PDF page count and text availability
- Spreadsheet sheet count, row count, column headers
- ZIP entry count and format distribution
- Image dimensions and MIME type
- CAD layer/block/entity/text summary

It should produce structured output:

```ts
interface FileSummary {
  filePath: string;
  fileName: string;
  category: string;
  supportLevel: string;
  metadata: Record<string, unknown>;
  signals: string[];
  warnings: string[];
  evidence?: Array<{ label: string; value: string; location?: string }>;
}
```

## Pack Responsibilities

A pack turns neutral file understanding into domain-specific workflow assistance.

A pack may provide:

- Field extractors
- Validation rules
- Domain dictionaries
- AI prompts
- Custom summary cards
- Export templates
- Regression samples

A pack must declare its scope and permissions.

Example manifest:

```json
{
  "id": "metal-materials",
  "name": "Metal Materials Pack",
  "version": "0.1.0",
  "supportedCategories": ["pdf", "office", "text", "cad", "archive"],
  "permissions": ["read-file-content", "read-metadata"],
  "entry": "./index.ts"
}
```

## Suggested Source Layout

```text
src/
  core/
    commands/
    files/
    workspace/
    security/
    recent/
  viewers/
    pdf/
    image/
    office/
    archive/
    cad/
    media/
    font/
    epub/
    code/
  understanding/
    extractors/
    summaries/
    evidence/
  packs/
    registry.ts
    types.ts
    engineering/
    metal/
    finance/
    legal/
    research/
    developer/
  components/
  app/

electron/
  ipc/
  security/
  file-system/
  sidecars/
```

The current codebase does not need to be reorganized all at once. New work should move in this direction incrementally.

## CAD Boundary

DWG is a closed and version-fragmented ecosystem. OpenMe should separate three capabilities:

1. **Native external fidelity**: launch AutoCAD, DWG TrueView, BricsCAD, GstarCAD, ZWCAD, or ODA/RealDWG-based tools when installed.
2. **Semantic inspection**: extract layers, blocks, entities, text, and basic document structure.
3. **Approximate preview**: render what open-source or auxiliary engines can reasonably show.

OpenMe must not describe approximate or semantic CAD output as AutoCAD-level fidelity.

## AI Boundary

AI should be action-oriented, not a generic chatbot bolted to the UI.

Good AI actions:

- Summarize this file
- Extract fields from this workspace
- Compare these two files
- Generate a review checklist
- Draft a reply based on extracted evidence
- Propose a CAD modification plan

Unsafe defaults:

- Mutating source files without confirmation
- Uploading private files by default
- Hiding model/source/tool limitations
- Presenting inferred content as verified evidence

## Release Engineering Direction

Required before a stable release:

- Regression sample suite
- CI build workflow
- Support matrix kept in sync with UI claims
- Release notes per version
- Clear security model for local, external, and AI-assisted actions
- Dependency audit issue tracking
