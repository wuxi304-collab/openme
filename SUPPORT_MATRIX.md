# OpenMe Support Matrix

OpenMe must describe file support by real capability, not by marketing language.

The source of truth for format coverage is now:

```text
src/file-registry/formats.ts
```

Generated matrix command:

```bash
npm run support:matrix
```

## Baseline rule

Supporting a file format in OpenMe means the format has a registry entry with:

- extension
- name
- category
- capabilities
- support level
- explicit boundary

A format should not be advertised in README, UI, roadmap or release notes unless it maps to the registry.

## Support levels

| Level | Meaning |
| --- | --- |
| A+ | Official or native-quality implementation. Rare; use only when the implementation is close to source-app fidelity. |
| A | Strong built-in local support. |
| B | Built-in preview or extraction with documented limits. |
| C | Approximate preview or text-level support. |
| D | Recognized with metadata, boundary, semantic inspection, or safe route. |
| E | External-open route only; no built-in preview claim. |
| F | Known but not supported. |

## Capability labels

| Capability | Meaning |
| --- | --- |
| `detect` | OpenMe can classify the file extension/family. |
| `preview` | OpenMe has a built-in viewer or useful rendering path. |
| `edit` | OpenMe can safely edit the file as text/table content. |
| `metadata` | OpenMe can show basic file or format metadata. |
| `thumbnail` | OpenMe can reasonably produce a thumbnail or visual preview. |
| `ai-summary` | OpenMe may use the format in an explicit understanding flow. |
| `external-open` | OpenMe can route to the system/default application. |

## Current matrix

| Category | Examples | Registry behavior | Boundary |
| --- | --- | --- | --- |
| Text and code | TXT, LOG, INI, CONF, JS, TS, PY, GO, JAVA, C/C++, HTML, CSS, SQL, SH, PS1, VUE, SVELTE, Verilog | Built-in text/code path for safe local editing. | OpenMe never executes scripts, build files, SQL, HDL or configuration files. |
| Markdown | MD, MDX | Built-in Markdown path. | MDX components are not executed. |
| Structured data | JSON, GeoJSON, CSV, TSV | Built-in JSON/table routes where implemented. | Schema validation and map rendering are not automatic. |
| Office | DOC, DOCX, XLS, XLSX, XLSM, PPT, PPTX, PPTM, WPS, ET, DPS, ODT, ODS, ODP, RTF, Pages, Numbers, Keynote | DOCX/XLSX have current approximate paths; the rest are recognized and routed. | No source-application fidelity claim; macros are never executed. |
| PDF and ebooks | PDF, EPUB, MOBI, AZW, AZW3, DJVU, CHM, HLP | PDF/EPUB have built-in paths; others are recognized/routed. | No OCR, DRM bypass or full layout fidelity claim unless separately implemented. |
| Images | JPG, PNG, GIF, BMP, WebP, AVIF, TIFF, HEIC, HEIF, RAW, CR2, NEF, ARW, ICO, ICNS, SVG | Browser-backed preview where supported; SVG is isolated. | Codec/OS support varies. SVG scripts are not executed. RAW decoding is not claimed. |
| Design and media projects | PSD, PSB, AI, EPS, CDR, Sketch, Figma, XD, PRPROJ, AEP, AUP3, VEG, DRP | Recognized, bounded, and routed. | No Photoshop, Illustrator, Figma, Sketch, Premiere, After Effects or Resolve fidelity claim. |
| Audio and video | MP3, WAV, FLAC, APE, AAC, OGG, OPUS, M4A, WMA, MIDI, MP4, MOV, AVI, MKV, WebM, FLV, RMVB, WMV, TS, M4V, 3GP | Built-in media path where Electron/Chromium can decode. | Container recognition is not codec support. Fallback must offer system open. |
| Archives | ZIP, RAR, 7Z, TAR, GZ, TGZ, BZ2, XZ, CAB, PAK, UnityPackage, MCWORLD, KMZ | ZIP has current built-in path; others are recognized and routed. | Do not claim safe extraction for non-ZIP formats until implemented. |
| Packages and installers | EXE, MSI, MSIX, PKG, APK, AAB, IPA, DEB, RPM, AppImage | Recognized and routed with safety boundary. | OpenMe never installs or executes packages. |
| Disk and VM images | ISO, IMG, WIM, GHO, VMDK, VDI, VHD, VHDX, QCOW2, OVA, OVF, SNAPSHOT, DMG | Recognized and routed with safety boundary. | OpenMe never mounts, boots, restores or imports disk/VM images automatically. |
| CAD, BIM, 3D and EDA | DWG, DXF, DGN, STL, OBJ, 3MF, glTF, GLB, STEP, STP, IGES, IFC, SKP, RVT, RFA, SAT, Parasolid, SolidWorks, CATIA, JT, Gerber, KiCad, GDSII | Current support ranges from approximate preview to semantic route. | No AutoCAD/BIM/source-CAD fidelity claim; manufacturing validation is not performed. |
| Databases and scientific data | SQLite, Access, Parquet, ORC, Avro, Feather, HDF5, NetCDF, MAT, FITS, NIfTI | Recognized and routed for future safe metadata work. | Internal browsing is not implemented unless explicitly added. |
| AI models and bioinformatics | ONNX, PT, PTH, CKPT, SafeTensors, GGUF, FASTA, FASTQ, SAM, BAM | Recognized with explicit no-execution boundary. | OpenMe never executes models; bioinformatics analysis is not implemented. |
| Fonts | TTF, OTF, WOFF, WOFF2, EOT, TTC, PFB, PFM | Built-in preview for common web/desktop fonts where implemented. | Advanced font table inspection is not fully implemented. |
| Certificates, mail and misc | CER, CRT, PEM, PFX, P12, KEY, ICS, VCF, MBOX, EML, TORRENT, ROM, SAV | Recognized and routed or text-previewed where safe. | OpenMe does not import certificates, download torrents, emulate ROMs or certify trust. |

## Media statement

Media support is intentionally conservative:

- OpenMe can classify and route common audio/video containers to the built-in media viewer.
- Playback still depends on Electron, Chromium and installed system codecs.
- A recognized extension does not mean every codec inside that container will decode.
- Unsupported playback should show an explicit codec-boundary explanation and offer system open.
- Source files are not modified or uploaded during media playback attempts.

## CAD statement

DWG/DXF and CAD support must remain explicitly qualified.

OpenMe can provide:

- quick structural inspection
- layer, block, entity, and text summaries when the engine can parse them
- approximate engineering preview where a safe viewer exists
- external launch into native CAD software when available

OpenMe must not promise:

- AutoCAD-level rendering fidelity
- complete SHX/font fidelity
- complete layout/paper-space fidelity
- complete proxy object fidelity
- safe direct mutation of original CAD files

## Design, package and disk-image statement

OpenMe recognizes design source files, app packages and disk images so the workspace can route them correctly and show honest boundaries.

Current behavior:

- classify the file family
- show support level and registry boundary
- avoid unsafe execution, mounting, installation or mutation
- prefer external open when native software exists

OpenMe must not promise:

- source-application rendering fidelity for proprietary design tools
- safe execution of installers or binaries
- automatic mounting or extraction of disk images
- malware scanning or security certification

## Future matrix items

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
- Safe scientific data preview for Parquet, HDF5 and NetCDF

## Rule for README and UI claims

Any README or UI support claim should map to one of the support levels above. If a capability is not listed in the registry, it should not be advertised as supported.
