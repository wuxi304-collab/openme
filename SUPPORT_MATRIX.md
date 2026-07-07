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
| Images | PNG, JPEG, GIF, BMP, WebP, AVIF, ICO, TIFF, HEIC, HEIF, RAW, DNG | Full built-in browsing, environment-dependent for newer codecs | Supports zoom, pan, rotation, fit, and 1:1 view where Chromium can decode the image. RAW/DNG are recognized but may require external viewing. |
| SVG | SVG | Safe approximate preview | Must be isolated from the main DOM. Do not execute scripts. |
| Text and code | TXT, MD, MDX, JSON, JSONL, NDJSON, XML, YAML, INI, LOG, JS, TS, JSX, TSX, PY, RS, GO, JAVA, C, C++, H, CSS, HTML, Dockerfile, Makefile, TF, GraphQL, Proto and common config files | Full built-in browsing | Editable text/code paths must preserve dirty-state warnings. |
| CSV | CSV | Full built-in browsing | Search, sort, pagination, malformed-row warnings. |
| JSON | JSON | Full built-in browsing | Node expansion and inspection. |
| ZIP | ZIP | Full built-in browsing | Guard against Zip Slip and large archive abuse. |
| PDF | PDF | High-fidelity browsing | Local PDF.js rendering, search, page navigation, rotation. No OCR claim. |
| DOCX | DOCX | Safe approximate preview | Mammoth extraction. No Word pagination, floating object, or complex style fidelity claim. |
| XLSX | XLSX | Data preview | Read-only values and sheets. No macro, formula engine, chart, conditional-format, or print-layout claim. |
| Office route | DOC, XLS, PPT, PPTX, ODT, ODS, ODP, RTF | External open / safe approximate where available | Do not imply full Office fidelity. |
| Archives beyond ZIP | RAR, 7Z, TAR, GZ, TGZ, BZ2, XZ, ZST | External open / future semantic inspection | Do not claim built-in extraction until a safe extractor is implemented. |
| EPUB | EPUB | Safe text reading | Metadata, chapters, navigation, search, font size. No complex layout fidelity claim. |
| Audio | MP3, WAV, OGG/OGA, M4A, AAC, FLAC, OPUS, WEBA, AIFF/AIF, WMA, ALAC, AMR, MIDI | Built-in playback, environment-dependent | File classification is broad; actual decoding depends on Chromium/Electron/system codecs. Playback failure shows a codec-boundary message and a system-open fallback. |
| Video | MP4, WebM, OGV, M4V, MOV, MKV, AVI, WMV, FLV, 3GP/3G2, TS, MTS, M2TS, MPEG, MPG, MXF | Built-in playback, environment-dependent | Container recognition is broad; H.264, AV1, HEVC, ProRes and legacy codecs depend on Electron/system support. Playback failure shows a codec-boundary message and a system-open fallback. |
| Fonts | TTF, OTF, WOFF, WOFF2, EOT | Full built-in preview | Custom sample text and font-size controls. |
| 3D | STL, OBJ, glTF, GLB, STEP, IGES, 3MF, PLY, FBX, DAE, 3DS, IFC, SKP | Experimental approximate preview / external open | Complex assemblies, materials, and STEP semantics require sample regression. |
| CAD | DWG, DXF | Semantic inspection / approximate preview / external native open | Do not claim AutoCAD-level fidelity. Prefer native external viewer when installed. |
| Design source files | PSD, PSB, AI, AIT, EPS, INDD, IDML, XD, Sketch, Figma, FIG, Affinity, CDR, Krita, Clip Studio, Aseprite | Semantic inspection / external open | Recognize and route design source files. Do not claim built-in Photoshop, Illustrator, Figma, Sketch, InDesign or Affinity fidelity. |
| App and package files | APK, IPA, JAR, WAR, EAR, APPX, MSIX, DEB, RPM, DMG, PKG, EXE, MSI | Semantic inspection / external open | Recognize application packages and installers. Do not execute installers or unknown binaries. Some package formats may later expose metadata safely. |
| Disk and VM images | ISO, IMG, VHD, VHDX, QCOW2, VMDK, OVA, OVF | Semantic inspection / external open | Recognize disk and VM images. Do not automatically mount, unpack or boot images. |

## Media Statement

Media support is intentionally conservative:

- OpenMe can classify and route common audio/video containers to the built-in media viewer.
- Playback still depends on Electron, Chromium and installed system codecs.
- A recognized extension does not mean every codec inside that container will decode.
- Unsupported playback shows an explicit codec-boundary explanation and offers system open.
- Source files are not modified or uploaded during media playback attempts.

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

## Design and package statement

OpenMe recognizes design source files, app packages and disk images so the workspace can route them correctly and show honest boundaries.

Current behavior:

- classify the file family
- show semantic-inspection support level through the understanding layer
- avoid unsafe execution, mounting, installation or mutation
- prefer external open when native software exists

OpenMe must not promise:

- Photoshop, Illustrator, Figma, Sketch, InDesign or Affinity rendering fidelity
- safe execution of installers or binaries
- automatic mounting or extraction of disk images
- malware scanning or security certification

## Future Matrix Items

Potential future support should be added only after sample-based regression:

- RAR/7Z built-in browsing
- PPTX safe slide preview
- PDF text layer and annotation support
- OCR as an optional explicit action
- Native CAD engine bridge
- Pack-specific summary cards
- Media codec diagnostics panel
- Safe package metadata panel for APK, IPA and JAR
- Safe design-file metadata panel for PSD, AI, Sketch and Figma exports

## Rule for README and UI Claims

Any README or UI support claim should map to one of the support levels above. If a capability is not listed here, it should not be advertised as supported.
