# OpenMe Packs

Packs are optional domain layers on top of OpenMe Core.

OpenMe Core should answer:

```text
What is this file?
How can it be opened safely?
What support boundary applies?
```

A Pack should answer:

```text
What does this file mean in a domain context?
What should the user check next?
What workflow can be started from this file?
```

## Planned official packs

| Pack | Purpose | Near-term scope |
| --- | --- | --- |
| `steel` | Metal materials and quotation files | material, standard, size, quantity, quote fields |
| `contract` | Contracts and legal documents | parties, dates, obligations, risk clauses |
| `finance` | Finance and reconciliation files | amount, currency, tax, invoice, balance checks |
| `cad` | Engineering drawings and models | layers, blocks, entities, geometry boundary |
| `academic` | Papers and research files | title, abstract, citation, notes, reading tasks |
| `office` | General office documents | summary, TODO, table extraction, presentation conversion |

## Pack maturity labels

| Status | Meaning |
| --- | --- |
| `planned` | Direction exists; no runtime behavior. |
| `experimental` | Works for selected examples; needs more samples. |
| `preview` | Usable with documented boundaries. |
| `stable` | Covered by tests and public examples. |

## Rule

A pack must not weaken OpenMe security boundaries.

No pack may silently:

- upload local files
- execute unknown binaries
- modify source files
- mount disk images
- overwrite CAD or Office originals

Every risky workflow must be explicit and reversible where possible.
