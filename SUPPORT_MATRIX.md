# OpenMe Support Matrix

OpenMe must describe file support by real capability, not by marketing language.

Support levels:

| Level | Meaning |
| --- | --- |
| Full built-in browsing | OpenMe can open and inspect the format locally with the stated features. |
| High-fidelity browsing | Rendering is close for common files, but advanced editing or layout features may be absent. |
| Safe approximate preview | OpenMe extracts and displays useful content, but does not promise source-application fidelity. |
| Semantic inspection | OpenMe can inspect structure, metadata, or text, but visual output may be incomplete. |
| External open | OpenMe can route the file to the system/default application. Built-in preview is not claimed. |
| Experimental | Works for selected samples and requires more regression coverage. |

## Current Matrix

| Category | Formats | Current level | Notes |
| --- | --- | --- | --- |
| Images | PNG, JPEG, GIF, BMP, WebP | Full built-in browsing | Supports zoom, pan, rotation, fit, and 1:1 view. |
| SVG | SVG | Safe approximate preview | Must be isolated from the main DOM. Do not execute scripts. |
| Text and code | TXT, MD, JSON, XML, YAML, INI, LOG, JS, TS, JSX, TSX, PY, RS, GO, JAVA, C, C++, H, CSS, HTML | Full built-in browsing | Editable text/code paths must preserve dirty-state warnings. |
| CSV | CSV | Full built-in browsing | Search, sort, pagination, malformed-row warnings. |
| JSON | JSON | Full built-in browsing | Node expansion and inspection. |
| ZIP | ZIP | Full built-in browsing | Guard against Zip Slip and large archive abuse. |
| PDF | PDF | High-fidelity browsing | Local PDF.js rendering, search, page navigation, rotation. No OCR claim. |
| DOCX | DOCX | Safe approximate preview | Mammoth extraction. No Word pagination, floating object, or complex style fidelity claim. |
| XLSX | XLSX | Data preview | Read-only values and sheets. No macro, formula engine, chart, conditional-format, or print-layout claim. |
| Legacy Office | DOC, XLS | External open | Old binary formats are not built-in viewers. |
| PowerPoint | PPT, PPTX | External open | Use system application until a reliable preview path exists. |
| Archives beyond ZIP | RAR, 7Z, TAR, GZ | External open | Do not claim built-in extraction. |
| EPUB | EPUB | Safe text reading | Metadata, chapters, navigation, search, font size. No complex layout fidelity claim. |
| Audio | MP3, WAV, OGG, M4A, AAC, FLAC | Built-in playback, environment-dependent | Actual codec support depends on Chromium/Electron/system codecs. |
| Video | MP4, WebM, OGV, M4V | Built-in playback, environment-dependent | H.264, AV1, HEVC, MOV support depends on Electron/system environment. |
| Fonts | TTF, OTF, WOFF, WOFF2 | Full built-in preview | Custom sample text and font-size controls. |
| 3D | STL, OBJ, glTF, GLB, STEP, IGES | Experimental approximate preview | Complex assemblies, materials, and STEP semantics require sample regression. |
| CAD | DWG, DXF | Semantic inspection / approximate preview / external native open | Do not claim AutoCAD-level fidelity. Prefer native external viewer when installed. |

## CAD Statement

DWG/DXF support must remain explicitly qualified.

OpenMe can provide:

- Quick structural inspection
- Layer, block, entity, and text summaries when the engine can parse them
- Approximate engineering preview
- External launch into native CAD software when available

OpenMe must not promise:

- AutoCAD-level rendering fidelity
- Complete SHX/font fidelity
- Complete layout/paper-space fidelity
- Complete proxy object fidelity
- Safe direct mutation of original CAD files

## Future Matrix Items

Potential future support should be added only after sample-based regression:

- RAR/7Z built-in browsing
- PPTX safe slide preview
- PDF text layer and annotation support
- OCR as an optional explicit action
- Native CAD engine bridge
- Pack-specific summary cards

## Rule for README and UI Claims

Any README or UI support claim should map to one of the support levels above. If a capability is not listed here, it should not be advertised as supported.
