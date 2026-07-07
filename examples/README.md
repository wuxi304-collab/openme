# OpenMe Examples

Examples should make contribution easy and safe.

Do not commit private customer files, commercial quotes, proprietary standards, or confidential drawings.

## Example types

| Type | Purpose |
| --- | --- |
| `basic-files` | Small public files for viewer checks. |
| `workspace-samples` | Safe multi-file project examples. |
| `pack-samples` | Domain pack input and expected output examples. |
| `workflow-samples` | File-to-action workflow demonstrations. |

## Rules for sample files

Sample files must be:

- public domain, self-authored, or explicitly licensed
- small enough for repository use
- free of personal, customer or business-sensitive data
- documented with source and license when not self-authored

## Preferred pattern

```text
examples/<case-name>/
  README.md
  input/
  expected/
  notes.md
```

## Current status

No binary sample files are included yet. Start with text fixtures and synthetic files before adding public binary samples.
