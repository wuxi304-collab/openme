# OpenMe Benchmarks

Benchmarks are for regression, not marketing.

OpenMe should measure whether file opening, detection, preview and understanding remain stable as format support expands.

## Benchmark dimensions

| Dimension | What to measure |
| --- | --- |
| Detection | Extension and category classification accuracy. |
| Open latency | Time to first useful viewer state. |
| Memory | Memory used by large files and viewers. |
| Safety | Unsafe archives, SVG, installers and disk images. |
| Fidelity boundary | Whether the UI reports the correct support level. |
| Crash recovery | Whether viewer failures stay isolated. |

## Initial benchmark targets

```text
PDF small / PDF large
XLSX small / XLSX wide / XLSX large
ZIP safe / ZIP unsafe path / ZIP large
SVG safe / SVG script-bearing
DWG simple / DWG complex
MP4 supported / MP4 unsupported codec
PSD route-only
APK route-only
ISO route-only
```

## Rule

A benchmark result should never be used to imply support beyond `SUPPORT_MATRIX.md`.
