# OpenMe SDK

This directory is the future home of OpenMe extension contracts.

The SDK should stay small and stable. It exists to help third parties build viewers, packs, workflows and metadata extractors without coupling to internal UI implementation details.

## Planned packages

```text
sdk/
  viewer-sdk/          File viewer registration contracts
  pack-sdk/            Domain pack contracts
  workflow-sdk/        File-to-action workflow contracts
  understanding-sdk/   Metadata, summary, evidence and risk contracts
```

## First principles

1. Core stays general.
2. Domain logic lives in packs.
3. Workflows are explicit and auditable.
4. Unsafe actions require clear user confirmation.
5. A plugin must declare its file support boundary.

## Minimal future contract

```ts
export interface OpenMeExtension {
  id: string;
  name: string;
  kind: "viewer" | "pack" | "workflow" | "extractor";
  supportedExtensions: string[];
  supportLevel: string;
}
```

This is not implemented yet. It is a scaffold for the public API direction.
