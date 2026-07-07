# Domain Packs

Domain packs let OpenMe add field extraction, validation rules, prompts, and workflow-specific summary cards without turning the core application into a single-industry tool.

Core rule:

```text
Viewer = opens or previews a file
Pack = understands or acts on a file
Core = coordinates files, windows, safety, workspace state, commands, and extension points
```

## Current files

| File | Purpose |
| --- | --- |
| `types.ts` | Type contracts for pack manifests, permissions, status, supported categories, and suggestions. |
| `builtin.ts` | Built-in pack manifests. |
| `registry.ts` | Helpers for listing packs, reading one pack, and suggesting packs from file signals. |
| `index.ts` | Public exports. |

## Built-in packs

| ID | 中文名 | Status | Enabled by default |
| --- | --- | --- | --- |
| `engineering` | 工程包 | experimental | yes |
| `metal-materials` | 金石包 | experimental | yes |
| `finance` | 账册包 | planned | no |
| `legal` | 契约包 | planned | no |
| `research` | 典籍包 | planned | no |
| `developer` | 匠作包 | planned | no |

## Usage

```ts
import { listDomainPacks, suggestDomainPacks } from "./packs";

const packs = listDomainPacks();

const suggestions = suggestDomainPacks({
  fileName: "customer-quote-304.xlsx",
  category: "office",
  text: "S30408 2B 1219 quotation",
});
```

## Next implementation step

Expose suggestions in the file/workspace UI:

1. Map existing file categories into `SupportedFileCategory`.
2. Call `suggestDomainPacks` when opening or focusing a file.
3. Show a small "可能适用的能力包" card in the sidebar or metadata panel.
4. Keep pack actions read-only until the permission model is wired.
