# OpenMe Evolution Roadmap

OpenMe should grow from basic file workmanship to an extension ecosystem.

## Stage 1: File workmanship

Goal: open common files safely and honestly.

Focus:

- file type detection
- viewer routing
- support levels
- error boundaries
- status bar and summary panel
- tests and CI
- security boundaries

Do not rush marketplace work before this layer is stable.

## Stage 2: Understanding layer

Goal: turn a file into structured knowledge.

Core objects:

```text
FileIdentity
Metadata
Summary
Evidence
Risk
Boundary
SuggestedActions
Relations
```

Every viewer should eventually produce or consume this layer.

## Stage 3: Workflows

Goal: turn repeated file tasks into explicit actions.

Examples:

- quote review
- contract review
- CAD review
- research reading
- archive intake
- media logging

Workflow execution must be explicit, auditable and reversible where possible.

## Stage 4: Pack ecosystem

Goal: let domains extend OpenMe without bloating Core.

Initial official packs:

- steel
- cad
- office
- finance
- contract
- academic

## Stage 5: Marketplace

Goal: allow community extensions while preserving user trust.

Before marketplace work starts, OpenMe needs:

- stable SDK contracts
- extension manifest format
- permission model
- sample validation
- install/update policy
- review policy

## Rule

First make files open well. Then make them understandable. Then make them actionable.
