# OpenMe Workflows

Workflows turn files into repeatable actions.

OpenMe should not jump from preview directly to automation. The stable sequence is:

```text
Open
  -> Identify
  -> Preview or Route
  -> Understand
  -> Suggest
  -> Confirm
  -> Execute
  -> Record
```

## Planned workflow families

| Workflow | Example input | Example output |
| --- | --- | --- |
| Quote Review | Excel, PDF, image, email export | structured quote fields, missing items, risk flags |
| Contract Review | DOCX, PDF | parties, dates, obligations, risk clauses |
| CAD Review | DWG, DXF, STEP | layers, blocks, entity summary, native-open suggestion |
| Research Reading | PDF, EPUB, Markdown | summary, notes, citations, open questions |
| Media Logging | MP4, MOV, MP3 | transcript, chapters, key frames, action items |
| Archive Intake | ZIP, 7Z, project folder | file tree, unsafe paths, likely project type |

## Workflow safety contract

A workflow must declare:

- input formats
- local or remote execution
- whether it reads file content
- whether it writes output files
- whether it modifies source files
- required user confirmation

## Current status

This directory is documentation-only. Runtime workflow execution is not implemented yet.
