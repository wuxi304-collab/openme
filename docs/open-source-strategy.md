# OpenMe Open Source Strategy

OpenMe is an open-source local-first file workspace. The repository should build trust through visible engineering discipline, not through broad claims.

## Positioning

OpenMe should evolve in four layers:

```text
Preview
  -> Understand
  -> Workflow
  -> Marketplace
```

The first layer is file format support. It must be solid, honest and testable.

The later layers should be built only after the foundation is stable:

- Understanding: metadata, summary, evidence, risk and suggested actions.
- Workflow: repeatable file-to-action pipelines.
- Marketplace: community packs, viewers, workflows and agents.

## Open source boundary

| Area | Strategy | Reason |
| --- | --- | --- |
| OpenMe Core | Open source | Builds trust and invites broad contribution. |
| Viewer framework | Open source | Format support benefits from community samples and fixes. |
| Pack SDK | Open source | Third parties need stable extension points. |
| Workflow SDK | Open source | Encourages repeatable file automation. |
| Basic sample packs | Open source | Gives contributors clear examples. |
| Commercial domain rules | Optional private layer | Some industry rules, datasets and customer logic are business assets. |
| Customer files and business data | Never open source | Privacy and commercial confidentiality. |

## Repository promise

The repository should be reliable before it is ambitious.

OpenMe should not claim:

- perfect support for every file format
- source-application fidelity for complex proprietary formats
- safe execution of installers or binaries
- automatic mounting of disk images
- AutoCAD-level DWG fidelity
- AI behavior without explicit user action

OpenMe should claim only what the code, tests and support matrix can support.

## Community entry points

A contributor should be able to help in one of these ways:

| Entry point | Contribution type |
| --- | --- |
| Viewers | Add or improve file preview components. |
| Detectors | Improve file type classification and support levels. |
| Understanding | Add metadata, summary, evidence and risk extractors. |
| Packs | Add domain-specific rules and suggested actions. |
| Workflows | Add repeatable file-to-action pipelines. |
| Examples | Provide safe public sample projects and demos. |
| Docs | Improve support boundaries, setup and usage guidance. |
| Tests | Add regression cases for formats and edge cases. |

## Quality gate

Every meaningful change should answer four questions:

1. What user problem does it solve?
2. What files or formats does it affect?
3. What support boundary changes?
4. What test or manual verification proves it?

## OpenMe maintainership rule

Do not merge vague capability expansion.

A format claim must map to:

- a detector rule
- a support level
- a viewer or route behavior
- a risk boundary
- at least one test or documented manual check

## Product sequence

Near-term priority remains basic workmanship:

1. file format detection
2. viewer stability
3. support matrix accuracy
4. error boundaries
5. metadata and summary panels
6. safe external routing
7. test coverage
8. CI validation

Only after that should OpenMe expand into workflows, pack marketplace and agent automation.
