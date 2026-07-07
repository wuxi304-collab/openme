# File Understanding Layer

The understanding layer turns file metadata and extracted content into a neutral, auditable summary.

It must stay domain-neutral. Domain-specific logic belongs in `src/packs`.

## Current scope

This foundation provides:

- `FileSummary` type contract
- support-level mapping
- `buildBasicFileSummary` for any opened file
- warnings for known boundary-heavy categories such as CAD, media, Office and SVG

## Usage

```ts
import { buildBasicFileSummary } from "../understanding";
import { detectCategory } from "../utils/fileTypeDetector";

const summary = buildBasicFileSummary({
  filePath: file.path,
  fileName: file.name,
  category: detectCategory(file.path),
  extension: file.extension,
  size: file.size,
});
```

## Design boundary

The understanding layer should produce neutral evidence:

- file name
- category
- support level
- file size
- extracted page/sheet/entry counts
- warnings about preview limitations

It should not directly decide domain workflow rules such as:

- material grade extraction
- invoice validation
- contract risk judgement
- CAD modification plans

Those belong to domain packs.

## Next steps

1. Show `FileSummary` in a metadata panel.
2. Add PDF page/text summary.
3. Add XLSX sheet/row/column summary.
4. Add ZIP entry count and safety summary.
5. Add CAD layer/block/entity summary mapping.
6. Let domain packs consume `FileSummary` as evidence.
