# OpenMe Engineering Roadmap

OpenMe Qiwu should be built as a file intelligence platform, not as a loose set of viewers. This roadmap keeps the architecture honest: the registry is the source of truth, viewers are presentation surfaces, and workflows are optional layers on top.

## Product thesis

```text
Open -> Identify -> Preview -> Understand -> Act
```

Opening a file is only the first step. The durable product value comes from knowing what the file is, what OpenMe can safely do with it, what it cannot claim, and what action should happen next.

## Architecture principles

| Principle | Rule |
| --- | --- |
| Registry first | A format claim must map to a registry entry, support level, capability list and boundary. |
| Local first | Do not upload user files by default. External processing must be explicit. |
| No silent execution | Scripts, installers, models, packages and disk images must never run automatically. |
| Boundary visible | Unsupported or partial behavior must be shown in UI, README and generated support matrix. |
| Viewers are replaceable | Viewer routing should eventually be registered rather than hard-coded by category. |
| Evidence before AI | AI summaries should cite registry, metadata, summary signals or extracted evidence. |

## V0.2.1 Registry completeness

Goal: make the file registry the single source of truth.

Current registry fields:

```text
extension
name
category
capabilities
supportLevel
boundary
mime
aliases
nativeApps
```

Recommended next fields:

```text
preferredViewer
openStrategy
riskLevel
tags
description
sampleFile
```

The registry should answer five questions for every format:

1. What is the file?
2. What category owns it?
3. What can OpenMe do safely?
4. What must OpenMe not claim?
5. What should the user do next?

## V0.2.2 Metadata engine

Goal: add a unified metadata layer that is independent of the viewer UI.

Proposed directory:

```text
src/metadata/
  types.ts
  extractMetadata.ts
  adapters/
    basicFileMetadata.ts
    textMetadata.ts
    imageMetadata.ts
    archiveMetadata.ts
    officeMetadata.ts
    mediaMetadata.ts
    cadMetadata.ts
```

Unified result shape:

```ts
interface MetadataResult {
  fileName: string;
  extension: string;
  category: string;
  size?: number;
  mime?: string;
  modifiedAt?: string;
  hash?: string;
  encoding?: string;
  createdBy?: string;
  pageCount?: number;
  sheetCount?: number;
  layerCount?: number;
  entityCount?: number;
  trackCount?: number;
  warnings: string[];
  evidence: MetadataEvidence[];
}
```

Metadata should be conservative. Missing metadata is acceptable; invented metadata is not.

## V0.2.3 Summary engine

Goal: make summaries deterministic before AI is involved.

Proposed directory:

```text
src/summary/
  types.ts
  buildSummary.ts
  summaries/
    documentSummary.ts
    officeSummary.ts
    archiveSummary.ts
    cadSummary.ts
    mediaSummary.ts
    specialistSummary.ts
```

Examples:

| Family | Deterministic summary |
| --- | --- |
| PDF | page count, text layer availability, title metadata, encryption flag. |
| Office | sheet count, approximate conversion status, macro warning. |
| Archive | file count, folder count, risky extensions, compression family. |
| CAD | version, layers, blocks, entities, fonts when a parser is available. |
| Media | container, duration, tracks, codec warnings when available. |
| AI model | framework family, no-execution boundary, external tooling recommendation. |

## V0.2.4 Evidence engine

Goal: every file-level recommendation should be traceable.

Evidence sources:

```text
Registry
Metadata
Summary
Viewer diagnostics
User actions
```

Evidence should be small, inspectable and structured:

```ts
interface FileEvidence {
  source: "registry" | "metadata" | "summary" | "viewer" | "user";
  label: string;
  value: string;
  severity: "info" | "warning" | "risk";
  location?: string;
}
```

## V0.2.5 Viewer registry

Goal: replace category-level switch statements with registered viewers.

Proposed shape:

```ts
interface ViewerRegistration {
  id: string;
  label: string;
  categories: string[];
  extensions?: string[];
  capabilities: string[];
  priority: number;
  component: React.ComponentType<ViewerProps>;
}
```

This allows future domain packs to register viewers without editing core routing logic.

## V0.2.6 Sample corpus

Goal: turn file support into regression-tested capability.

Proposed layout:

```text
samples/
  pdf/
  office/
  image/
  media/
  archive/
  cad/
  bim/
  eda/
  gis/
  science/
  ai-model/
  bio/
  package/
  disk/
```

Each folder should eventually include:

```text
small
normal
large
broken
encrypted
unicode-name
legacy
edge-case
```

CI should validate:

| Check | Requirement |
| --- | --- |
| Detect | extension maps to expected registry entry. |
| Route | viewer or semantic route is selected. |
| Boundary | unsafe formats stay non-executable and non-editable. |
| Metadata | extraction returns structured result or explicit unsupported reason. |
| Summary | summary returns deterministic signals and warnings. |

## V0.3 Workflow runtime

Goal: turn file understanding into repeatable tasks.

Initial workflow families:

| Workflow | Input | Output |
| --- | --- | --- |
| Document review | PDF, DOCX, Markdown | summary, evidence, risk flags. |
| Quote package review | Excel, PDF, images, ZIP | item extraction, missing fields, confidence. |
| CAD handoff check | DWG, DXF, STEP, PDF | CAD boundary card, native-app recommendation. |
| Archive inspection | ZIP and routed archives | tree, risky file families, size summary. |
| Research folder brief | PDFs, datasets, notebooks | source list, metadata, reading order. |

## Non-goals

OpenMe should not claim:

- perfect compatibility with proprietary authoring tools
- AutoCAD-level DWG fidelity
- Photoshop/Illustrator/Figma source fidelity
- universal media codec support
- malware scanning or security certification
- automatic package installation
- automatic disk-image mounting
- automatic model execution

## Merge discipline

Before merging a format-support PR:

1. Registry entries are present.
2. Support boundaries are explicit.
3. Tests cover detection and unsafe-category behavior.
4. Generated support matrix runs in CI.
5. README claims match actual registry behavior.
6. Build passes on Windows CI.

## Near-term backlog

| Priority | Task |
| --- | --- |
| P0 | Keep PR #12 green and merge it. |
| P0 | Add `openStrategy` and `riskLevel` to registry types. |
| P0 | Add deterministic metadata result types. |
| P1 | Add sample corpus manifest without committing large binaries. |
| P1 | Add Viewer Registry skeleton. |
| P1 | Add generated Registry Dashboard markdown. |
| P2 | Add pack runtime proposal. |
| P2 | Add benchmark harness for open latency and memory. |
