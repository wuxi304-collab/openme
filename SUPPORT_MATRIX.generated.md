# OpenMe Generated Support Matrix

This file is generated from `src/file-registry/formats.ts` and `src/file-registry/expanded-formats.ts`. Do not use it as marketing copy without checking the boundaries.

Total registered formats: **370**

## Support Levels

| Level | Meaning |
| --- | --- |
| A+ | Official or native-quality implementation |
| A | Strong built-in local support |
| B | Built-in preview or extraction with documented limits |
| C | Approximate preview or text-level support |
| D | Recognized with metadata, boundary, or semantic route |
| E | External-open route only; no built-in preview claim |
| F | Known but not supported |

## Category Summary

| Category | Count | Support distribution |
| --- | ---: | --- |
| 3D / CAD / BIM | 39 | C: 9 · D: 30 |
| Archives | 20 | B: 1 · D: 19 |
| Audio | 21 | B: 2 · C: 7 · D: 12 |
| Delimited Data | 2 | A: 1 · B: 1 |
| Design and Media Projects | 13 | D: 13 |
| Disk and VM Images | 13 | E: 13 |
| Drawings / EDA | 24 | D: 24 |
| Ebooks | 4 | B: 1 · E: 3 |
| Fonts | 8 | B: 4 · D: 4 |
| Images | 24 | A: 5 · B: 3 · D: 16 |
| JSON and Structured Text | 2 | A: 1 · B: 1 |
| Markdown | 2 | A: 1 · C: 1 |
| Office Documents | 18 | B: 2 · D: 10 · E: 6 |
| Other / Specialist | 57 | D: 42 · E: 15 |
| Packages and Installers | 13 | D: 5 · E: 8 |
| PDF | 1 | A: 1 |
| SVG | 1 | B: 1 |
| Text and Code | 90 | A: 51 · B: 11 · C: 26 · D: 2 |
| Video | 18 | B: 2 · C: 2 · D: 14 |

## Formats by Category

### 3D / CAD / BIM

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.3mf` | 3D Manufacturing Format | C | 3D manufacturing preview is approximate; no print validation is performed. |
| `.glb` | Binary glTF | C | 3D preview is approximate. |
| `.gltf` | glTF | C | 3D preview is approximate. |
| `.iges` | IGES | C | Industrial CAD preview is approximate. |
| `.igs` | IGES | C | Industrial CAD preview is approximate. |
| `.obj` | Wavefront OBJ | C | 3D preview is approximate; materials may be limited. |
| `.step` | STEP | C | Industrial CAD preview is approximate; no manufacturing guarantee. |
| `.stl` | STL | C | Mesh preview only; manufacturing validation is not performed. |
| `.stp` | STEP | C | Industrial CAD preview is approximate; no manufacturing guarantee. |
| `.3dm` | Rhino 3D Model | D | Recognized 3D model; native parsing is not implemented. |
| `.3ds` | 3D Studio Model | D | Recognized 3D model; native parsing is not implemented. |
| `.asm` | CAD Assembly | D | Recognized CAD assembly; vendor-specific parsing is not implemented. |
| `.blend` | Blender | D | Recognized source project; Blender fidelity is not implemented. |
| `.c4d` | Cinema 4D | D | External open route only. |
| `.catpart` | CATIA Part | D | Recognized CAD source; native parsing is not implemented. |
| `.catproduct` | CATIA Product | D | Recognized CAD source; native parsing is not implemented. |
| `.dae` | COLLADA | D | Recognized 3D exchange file; preview may be limited. |
| `.f3d` | Fusion 360 Design | D | Recognized CAD source; cloud/native parsing is not implemented. |
| `.fbx` | FBX | D | Recognized 3D format; full animation/material fidelity is not implemented. |
| `.iam` | Inventor Assembly | D | Recognized CAD source; native parsing is not implemented. |
| `.ifc` | Industry Foundation Classes | D | Recognized BIM exchange file; full BIM inspection is not implemented. |
| `.ipt` | Inventor Part | D | Recognized CAD source; native parsing is not implemented. |
| `.jt` | JT | D | Recognized lightweight CAD exchange file; native parsing is not implemented. |
| `.max` | 3ds Max | D | External open route only. |
| `.mb` | Maya Binary | D | External open route only. |
| `.nwc` | Navisworks Cache | D | Recognized BIM coordination file; native parsing is not implemented. |
| `.nwd` | Navisworks Document | D | Recognized BIM coordination file; native parsing is not implemented. |
| `.nwf` | Navisworks File Set | D | Recognized BIM coordination file; native parsing is not implemented. |
| `.pln` | Archicad Project | D | Recognized BIM source; native parsing is not implemented. |
| `.ply` | Polygon File Format | D | Recognized mesh file; full material support is not implemented. |
| `.prt` | CAD Part | D | Recognized CAD part; vendor-specific parsing is not implemented. |
| `.rfa` | Revit Family | D | Recognized BIM source; native parsing is not implemented. |
| `.rvt` | Revit Project | D | Recognized BIM source; native parsing is not implemented. |
| `.sat` | ACIS SAT | D | Recognized CAD exchange file; native parsing is not implemented. |
| `.skp` | SketchUp | D | Recognized 3D design file; native parsing is not implemented. |
| `.sldasm` | SolidWorks Assembly | D | Recognized CAD source; native parsing is not implemented. |
| `.sldprt` | SolidWorks Part | D | Recognized CAD source; native parsing is not implemented. |
| `.x_b` | Parasolid Binary | D | Recognized CAD exchange file; native parsing is not implemented. |
| `.x_t` | Parasolid Text | D | Recognized CAD exchange file; native parsing is not implemented. |

### Archives

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.zip` | ZIP Archive | B | ZIP listing and safe extraction; non-ZIP archives need external tools. |
| `.7z` | 7-Zip Archive | D | Recognized and routed; built-in 7z extraction is not implemented. |
| `.bz2` | Bzip2 | D | Recognized and routed; built-in extraction is not implemented. |
| `.cab` | Windows Cabinet | D | External open route only. |
| `.gz` | Gzip | D | Recognized and routed; built-in gzip extraction is not implemented. |
| `.kmz` | KMZ | D | Recognized compressed GIS file; map rendering is not implemented. |
| `.mcworld` | Minecraft World | D | Recognized archive-like world file; game import is not performed. |
| `.npz` | NumPy Archive | D | Recognized numerical archive; array browsing is not implemented. |
| `.pak` | Game Resource Pack | D | Recognized resource package; game-specific extraction is not implemented. |
| `.rar` | RAR Archive | D | Recognized and routed; built-in RAR extraction is not implemented. |
| `.tar` | TAR Archive | D | Recognized and routed; built-in TAR extraction is not implemented. |
| `.tar.bz2` | Bzip2 Tarball | D | Recognized compound archive; safe extraction is not implemented. |
| `.tar.gz` | Gzip Tarball | D | Recognized compound archive; safe extraction is not implemented. |
| `.tar.xz` | XZ Tarball | D | Recognized compound archive; safe extraction is not implemented. |
| `.tbz2` | Bzip2 Tarball | D | Recognized compound archive; safe extraction is not implemented. |
| `.tgz` | Tar Gzip | D | Recognized and routed; built-in extraction is not implemented. |
| `.txz` | XZ Tarball | D | Recognized compound archive; safe extraction is not implemented. |
| `.unitypackage` | Unity Package | D | Recognized package; Unity import is not performed. |
| `.xz` | XZ | D | Recognized and routed; built-in extraction is not implemented. |
| `.zst` | Zstandard Archive | D | Recognized compressed file; decompression is not implemented. |

### Audio

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.mp3` | MP3 Audio | B | Playback depends on runtime codec support. |
| `.wav` | WAV Audio | B | Playback depends on runtime codec support. |
| `.aac` | AAC Audio | C | Playback depends on runtime codec support. |
| `.aif` | AIFF Audio | C | Playback depends on runtime codec support. |
| `.aiff` | AIFF Audio | C | Playback depends on runtime codec support. |
| `.flac` | FLAC Audio | C | Playback depends on runtime codec support. |
| `.m4a` | M4A Audio | C | Playback depends on runtime codec support. |
| `.ogg` | Ogg Audio | C | Playback depends on runtime codec support. |
| `.opus` | Opus Audio | C | Playback depends on runtime codec support. |
| `.aif` | AIFF Audio | D | Recognized audio file; playback depends on runtime codec support. |
| `.aiff` | AIFF Audio | D | Recognized audio file; playback depends on runtime codec support. |
| `.alac` | Apple Lossless Audio | D | Recognized audio file; playback depends on runtime codec support. |
| `.amr` | AMR Audio | D | Recognized telephony audio; playback is not guaranteed. |
| `.ape` | APE Audio | D | Recognized; playback is not guaranteed. |
| `.dff` | DSD Stream (DFF) | D | Recognized; DSD playback requires an external DSD-capable player or DAC. |
| `.dsf` | DSD Stream (DSF) | D | Recognized; DSD playback requires an external DSD-capable player or DAC. |
| `.mid` | MIDI | D | Recognized; MIDI synthesis is not implemented. |
| `.midi` | MIDI | D | Recognized; MIDI synthesis is not implemented. |
| `.oga` | Ogg Audio | D | Recognized audio container; playback depends on runtime codec support. |
| `.weba` | WebM Audio | D | Recognized audio container; playback depends on runtime codec support. |
| `.wma` | Windows Media Audio | D | Recognized; playback is not guaranteed. |

### Delimited Data

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.csv` | CSV | A | Delimited table preview; dialect detection may need refinement. |
| `.tsv` | TSV | B | Delimited table preview; treated as tabular text. |

### Design and Media Projects

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.aep` | After Effects Project | D | Recognized media project; source application fidelity is not supported. |
| `.ai` | Adobe Illustrator | D | Recognized design source; Illustrator fidelity is not supported. |
| `.aup3` | Audacity Project | D | Recognized audio project; source application fidelity is not supported. |
| `.cdr` | CorelDRAW | D | External open route; native parsing is not implemented. |
| `.drp` | DaVinci Resolve Project | D | Recognized video project; source application fidelity is not supported. |
| `.eps` | Encapsulated PostScript | D | Recognized print/vector format; rendering is not guaranteed. |
| `.fig` | Figma | D | Recognized design source; online Figma parsing is not implemented. |
| `.prproj` | Premiere Pro Project | D | Recognized media project; source application fidelity is not supported. |
| `.psb` | Photoshop Large Document | D | Recognized design source; Photoshop fidelity and editing are not supported. |
| `.psd` | Photoshop Document | D | Recognized design source; Photoshop fidelity and editing are not supported. |
| `.sketch` | Sketch | D | Recognized design source; native parsing is not implemented. |
| `.veg` | Vegas Project | D | Recognized video project; source application fidelity is not supported. |
| `.xd` | Adobe XD | D | Recognized prototype source; native parsing is not implemented. |

### Disk and VM Images

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.dmg` | macOS Disk Image | E | OpenMe never mounts disk images automatically. |
| `.gho` | Ghost Image | E | Recognized backup image; OpenMe does not restore images. |
| `.img` | Disk Image | E | OpenMe never mounts images automatically. |
| `.iso` | ISO Image | E | OpenMe never mounts images automatically. |
| `.ova` | Open Virtual Appliance | E | OpenMe never imports or boots virtual machines. |
| `.ovf` | Open Virtualization Format | E | OpenMe never imports or boots virtual machines. |
| `.qcow2` | QEMU QCOW2 | E | OpenMe never mounts or boots virtual disks. |
| `.snapshot` | Virtual Machine Snapshot | E | OpenMe never restores VM snapshots. |
| `.vdi` | VirtualBox Disk | E | OpenMe never mounts or boots virtual disks. |
| `.vhd` | Virtual Hard Disk | E | OpenMe never mounts or boots virtual disks. |
| `.vhdx` | Hyper-V Disk | E | OpenMe never mounts or boots virtual disks. |
| `.vmdk` | VMware Disk | E | OpenMe never mounts or boots virtual disks. |
| `.wim` | Windows Imaging Format | E | Recognized system image; OpenMe does not deploy images. |

### Drawings / EDA

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.brd` | Board Layout | D | Recognized board file; EDA rendering is not implemented. |
| `.catdrawing` | CATIA Drawing | D | Recognized CAD drawing; native rendering is not implemented. |
| `.dgn` | MicroStation DGN | D | Recognized engineering drawing; native parsing is not implemented. |
| `.drl` | Excellon Drill | D | Recognized PCB drill file; manufacturing validation is not implemented. |
| `.dsn` | Design File | D | Recognized EDA/design file; native parsing is not implemented. |
| `.dwg` | AutoCAD DWG | D | Semantic inspection and compatible preview only; not AutoCAD fidelity. |
| `.dxf` | AutoCAD DXF | D | Semantic inspection and compatible preview only; not AutoCAD fidelity. |
| `.gbl` | Gerber Bottom Layer | D | Recognized Gerber layer; rendering is not implemented. |
| `.gbo` | Gerber Bottom Overlay | D | Recognized Gerber layer; rendering is not implemented. |
| `.gbr` | Gerber | D | Recognized PCB manufacturing file; rendering is not implemented. |
| `.gbs` | Gerber Bottom Soldermask | D | Recognized Gerber layer; rendering is not implemented. |
| `.gds` | GDSII | D | Recognized chip layout file; EDA rendering is not implemented. |
| `.ger` | Gerber | D | Recognized PCB manufacturing file; rendering is not implemented. |
| `.gtl` | Gerber Top Layer | D | Recognized Gerber layer; rendering is not implemented. |
| `.gto` | Gerber Top Overlay | D | Recognized Gerber layer; rendering is not implemented. |
| `.gts` | Gerber Top Soldermask | D | Recognized Gerber layer; rendering is not implemented. |
| `.idw` | Inventor Drawing | D | Recognized CAD drawing; native rendering is not implemented. |
| `.kicad_pcb` | KiCad PCB | D | Recognized PCB file; EDA rendering is not implemented. |
| `.kicad_pro` | KiCad Project | D | Recognized EDA project; rendering is not implemented. |
| `.kicad_sch` | KiCad Schematic | D | Recognized EDA schematic; rendering is not implemented. |
| `.pcbdoc` | Altium PCB | D | Recognized PCB design file; native parsing is not implemented. |
| `.sch` | Schematic | D | Recognized schematic file; EDA rendering is not implemented. |
| `.schdoc` | Altium Schematic | D | Recognized schematic file; native parsing is not implemented. |
| `.slddrw` | SolidWorks Drawing | D | Recognized CAD drawing; native rendering is not implemented. |

### Ebooks

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.epub` | EPUB | B | Readable book extraction; DRM and advanced layout are not supported. |
| `.azw` | Kindle AZW | E | Recognized and routed; DRM is not bypassed. |
| `.azw3` | Kindle AZW3 | E | Recognized and routed; DRM is not bypassed. |
| `.mobi` | Mobipocket | E | Recognized and routed; native parsing is not implemented. |

### Fonts

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.otf` | OpenType Font | B | Basic font preview; advanced font tables are not fully inspected. |
| `.ttf` | TrueType Font | B | Basic font preview; advanced font tables are not fully inspected. |
| `.woff` | Web Font | B | Basic font preview. |
| `.woff2` | Web Font 2 | B | Basic font preview. |
| `.eot` | Embedded OpenType | D | Recognized legacy font; preview is not guaranteed. |
| `.pfb` | PostScript Font Binary | D | Recognized legacy font; preview is not guaranteed. |
| `.pfm` | PostScript Font Metrics | D | Recognized legacy font; preview is not guaranteed. |
| `.ttc` | TrueType Collection | D | Recognized font collection; preview is not guaranteed. |

### Images

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.gif` | GIF Image | A | Animated GIF depends on browser image support. |
| `.jpeg` | JPEG Image | A | Browser-backed image preview; EXIF extraction is limited. |
| `.jpg` | JPEG Image | A | Browser-backed image preview; EXIF extraction is limited. |
| `.png` | PNG Image | A | Browser-backed image preview. |
| `.webp` | WebP Image | A | Browser-backed preview. |
| `.avif` | AVIF Image | B | Preview depends on runtime codec support. |
| `.bmp` | Bitmap Image | B | Browser-backed preview. |
| `.ico` | Windows Icon | B | Basic image preview; multi-resolution details may be limited. |
| `.arw` | Sony RAW | D | RAW decoding is not implemented. |
| `.cr2` | Canon RAW | D | RAW decoding is not implemented. |
| `.dng` | Digital Negative RAW | D | Recognized camera RAW file; RAW decoding is not implemented. |
| `.exr` | OpenEXR Image | D | Recognized high-dynamic-range image; preview is not implemented. |
| `.geotiff` | GeoTIFF | D | Recognized geospatial raster; map rendering is not implemented. |
| `.hdr` | Radiance HDR | D | Recognized HDR image; preview is not implemented. |
| `.heic` | HEIC Image | D | Preview depends on OS/runtime support. |
| `.heif` | HEIF Image | D | Preview depends on OS/runtime support. |
| `.icns` | Apple Icon | D | Recognized and routed; ICNS parsing is not implemented. |
| `.nef` | Nikon RAW | D | RAW decoding is not implemented. |
| `.orf` | Olympus RAW | D | Recognized camera RAW file; RAW decoding is not implemented. |
| `.raf` | Fujifilm RAW | D | Recognized camera RAW file; RAW decoding is not implemented. |
| `.raw` | Camera RAW | D | Recognized as RAW-like image; vendor decoding is not implemented. |
| `.rw2` | Panasonic RAW | D | Recognized camera RAW file; RAW decoding is not implemented. |
| `.tif` | TIFF Image | D | Recognized; multi-page TIFF preview is not guaranteed. |
| `.tiff` | TIFF Image | D | Recognized; multi-page TIFF preview is not guaranteed. |

### JSON and Structured Text

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.json` | JSON | A | JSON preview/edit; schema validation is not automatic. |
| `.geojson` | GeoJSON | B | JSON preview; map rendering is not implemented. |

### Markdown

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.md` | Markdown | A | Markdown preview and editing; embedded unsafe HTML may be sanitized by viewer behavior. |
| `.mdx` | MDX | C | Markdown-like preview; React component execution is not supported. |

### Office Documents

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.docx` | Microsoft Word | B | HTML conversion preview; not source-application fidelity. |
| `.xlsx` | Microsoft Excel | B | Table preview with pagination; formulas/macros are not executed. |
| `.doc` | Microsoft Word Legacy | D | Recognized and routed; legacy binary Office rendering is limited. |
| `.odp` | OpenDocument Presentation | D | Recognized and routed; OpenDocument rendering is not yet implemented. |
| `.ods` | OpenDocument Spreadsheet | D | Recognized and routed; OpenDocument rendering is not yet implemented. |
| `.odt` | OpenDocument Text | D | Recognized and routed; OpenDocument rendering is not yet implemented. |
| `.ppt` | PowerPoint Legacy | D | Recognized and routed; slide preview is not implemented. |
| `.pptm` | PowerPoint Macro Presentation | D | Macros are never executed; preview support is limited. |
| `.pptx` | PowerPoint | D | Recognized and routed; animation and slide fidelity are not implemented. |
| `.rtf` | Rich Text Format | D | Recognized and routed; rich rendering is not yet implemented. |
| `.xls` | Microsoft Excel Legacy | D | Recognized and routed; legacy binary Excel rendering is limited. |
| `.xlsm` | Excel Macro Workbook | D | Macros are never executed; preview support is limited. |
| `.dps` | WPS Presentation | E | External open route only. |
| `.et` | WPS Spreadsheets | E | External open route only. |
| `.keynote` | Apple Keynote | E | External open route only. |
| `.numbers` | Apple Numbers | E | External open route only. |
| `.pages` | Apple Pages | E | External open route only. |
| `.wps` | WPS Writer | E | External open route only. |

### Other / Specialist

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.accdb` | Access Database | D | External open route only. |
| `.avro` | Apache Avro | D | Recognized data file; preview is not implemented. |
| `.bak` | Backup File | D | Recognized backup file; restore/import is not performed. |
| `.bam` | BAM | D | Recognized bioinformatics binary; internal browsing is not implemented. |
| `.cdf` | Common Data Format | D | Recognized scientific data file; internal browsing is not implemented. |
| `.cer` | Certificate | D | Recognized certificate; trust validation is not implemented. |
| `.cram` | CRAM | D | Recognized bioinformatics binary; internal browsing is not implemented. |
| `.crt` | Certificate | D | Recognized certificate; trust validation is not implemented. |
| `.db` | SQLite Database | D | Recognized database file; SQL browsing is not implemented. |
| `.db3` | SQLite Database | D | Recognized database file; SQL browsing is not implemented. |
| `.dbf` | dBASE / Shapefile Table | D | Recognized tabular/GIS companion file; table browsing is not implemented. |
| `.dem` | Digital Elevation Model | D | Recognized terrain data; visualization is not implemented. |
| `.eml` | Email Message | D | Recognized email file; MIME rendering is not implemented. |
| `.feather` | Feather | D | Recognized data file; preview is not implemented. |
| `.fits` | FITS | D | Recognized scientific image/data file; internal browsing is not implemented. |
| `.frm` | MySQL Table Definition | D | Recognized database file; database recovery is not implemented. |
| `.gguf` | GGUF Model | D | Recognized LLM model file; model execution is not supported. |
| `.gpkg` | GeoPackage | D | Recognized GIS package; map rendering is not implemented. |
| `.grb` | GRIB Weather Data | D | Recognized meteorological data; visualization is not implemented. |
| `.grib` | GRIB Weather Data | D | Recognized meteorological data; visualization is not implemented. |
| `.h5` | HDF5 | D | Recognized scientific data file; internal browsing is not implemented. |
| `.hdf` | HDF | D | Recognized scientific data file; internal browsing is not implemented. |
| `.hdf5` | HDF5 | D | Recognized scientific data file; internal browsing is not implemented. |
| `.ibd` | InnoDB Tablespace | D | Recognized database file; database recovery is not implemented. |
| `.las` | LAS Point Cloud | D | Recognized point cloud file; visualization is not implemented. |
| `.laz` | LAZ Point Cloud | D | Recognized compressed point cloud; visualization is not implemented. |
| `.mat` | MATLAB Data | D | Recognized scientific data file; internal browsing is not implemented. |
| `.mbox` | Mailbox Archive | D | Recognized mail archive; mail browsing is not implemented. |
| `.mdb` | Access Database | D | External open route only. |
| `.nc` | NetCDF | D | Recognized scientific data file; internal browsing is not implemented. |
| `.nii` | NIfTI | D | Recognized medical/scientific data file; internal browsing is not implemented. |
| `.nii.gz` | Compressed NIfTI | D | Recognized medical/scientific data file; internal browsing is not implemented. |
| `.npy` | NumPy Array | D | Recognized numerical data file; array browsing is not implemented. |
| `.onnx` | ONNX Model | D | Recognized AI model; model execution is not supported. |
| `.orc` | Apache ORC | D | Recognized columnar data file; table preview is not implemented. |
| `.parquet` | Apache Parquet | D | Recognized columnar data file; table preview is not implemented. |
| `.safetensors` | SafeTensors | D | Recognized model tensor file; model execution is not supported. |
| `.shp` | ESRI Shapefile | D | Recognized GIS file; map rendering is not implemented. |
| `.shx` | Shapefile Index | D | Recognized GIS companion file; map rendering is not implemented. |
| `.sqlite` | SQLite Database | D | Recognized database file; SQL browsing is not implemented. |
| `.torrent` | BitTorrent File | D | Recognized metadata file; OpenMe does not download torrents. |
| `.uasset` | Unreal Asset | D | Recognized game asset; Unreal parsing is not implemented. |
| `.chm` | Compiled HTML Help | E | External open route only. |
| `.ckpt` | Checkpoint | E | OpenMe never executes model files. |
| `.djvu` | DjVu | E | External open route only. |
| `.hlp` | Windows Help | E | External open route only. |
| `.joblib` | Joblib Model/Data | E | OpenMe never executes serialized model objects. |
| `.mlmodel` | Core ML Model | E | OpenMe never executes model files. |
| `.p12` | PKCS#12 Bundle | E | OpenMe does not import certificates. |
| `.pb` | TensorFlow Graph | E | OpenMe never executes model files. |
| `.pfx` | PKCS#12 Bundle | E | OpenMe does not import certificates. |
| `.pkl` | Pickle Model/Data | E | OpenMe never unpickles or executes serialized objects. |
| `.pt` | PyTorch Model | E | OpenMe never executes model files. |
| `.pth` | PyTorch Checkpoint | E | OpenMe never executes model files. |
| `.rom` | Game ROM | E | OpenMe never emulates or runs ROM files. |
| `.sav` | Game Save | E | External open route only. |
| `.tflite` | TensorFlow Lite Model | E | OpenMe never executes model files. |

### Packages and Installers

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.aab` | Android App Bundle | D | Recognized Android bundle; OpenMe does not install or run it. |
| `.apk` | Android APK | D | Recognized Android package; OpenMe does not install or run it. |
| `.deb` | Debian Package | D | Recognized Linux package; OpenMe does not install it. |
| `.ipa` | iOS App | D | Recognized iOS package; OpenMe does not install or run it. |
| `.rpm` | RPM Package | D | Recognized Linux package; OpenMe does not install it. |
| `.appimage` | AppImage | E | OpenMe never executes AppImage binaries. |
| `.ear` | Java Enterprise Archive | E | Recognized deployable package; OpenMe never executes or deploys it. |
| `.exe` | Windows Executable | E | OpenMe never executes installers or unknown binaries. |
| `.jar` | Java Archive | E | OpenMe never executes Java archives. |
| `.msi` | Windows Installer | E | OpenMe never executes installers. |
| `.msix` | MSIX Package | E | OpenMe never installs packages. |
| `.pkg` | macOS Installer | E | OpenMe never runs installers. |
| `.war` | Java Web Archive | E | Recognized deployable package; OpenMe never executes or deploys it. |

### PDF

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.pdf` | PDF | A | High-quality PDF preview; editing is not supported. |

### SVG

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.svg` | SVG | B | Rendered safely as image; script execution is not supported. |

### Text and Code

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.bat` | Windows Batch | A | Text editing only; scripts are never executed. |
| `.c` | C | A | Text editing only; code is never executed. |
| `.cjs` | CommonJS | A | Text editing only; code is never executed. |
| `.cmd` | Windows Command Script | A | Text editing only; scripts are never executed. |
| `.cpp` | C++ | A | Text editing only; code is never executed. |
| `.cs` | C# | A | Text editing only; code is never executed. |
| `.css` | CSS | A | Text editing only. |
| `.dockerfile` | Dockerfile | A | Text editing only; Docker build is never executed. |
| `.dockerignore` | Docker Ignore | A | Text editing only; Docker builds are never executed. |
| `.go` | Go | A | Text editing only; code is never executed. |
| `.gql` | GraphQL | A | Text editing only; schema validation is not automatic. |
| `.gradle` | Gradle | A | Text editing only; build scripts are never executed. |
| `.graphql` | GraphQL | A | Text editing only; schema validation is not automatic. |
| `.h` | C/C++ Header | A | Text editing only; code is never executed. |
| `.hpp` | C++ Header | A | Text editing only; code is never executed. |
| `.htm` | HTML | A | Text editing only; HTML is not executed as an app. |
| `.html` | HTML | A | Text editing only; HTML is not executed as an app. |
| `.java` | Java | A | Text editing only; code is never executed. |
| `.js` | JavaScript | A | Text editing only; code is never executed. |
| `.jsx` | React JSX | A | Text editing only; component is not executed. |
| `.kt` | Kotlin | A | Text editing only; code is never executed. |
| `.less` | Less | A | Text editing only. |
| `.lua` | Lua | A | Text editing only; code is never executed. |
| `.mjs` | JavaScript Module | A | Text editing only; code is never executed. |
| `.php` | PHP | A | Text editing only; code is never executed. |
| `.pl` | Perl | A | Text editing only; code is never executed. |
| `.proto` | Protocol Buffers | A | Text editing only; code generation is not executed. |
| `.ps1` | PowerShell | A | Text editing only; scripts are never executed. |
| `.py` | Python | A | Text editing only; code is never executed. |
| `.r` | R | A | Text editing only; code is never executed. |
| `.rb` | Ruby | A | Text editing only; code is never executed. |
| `.rs` | Rust | A | Text editing only; code is never executed. |
| `.sass` | Sass | A | Text editing only. |
| `.scala` | Scala | A | Text editing only; code is never executed. |
| `.scss` | SCSS | A | Text editing only. |
| `.sh` | Shell Script | A | Text editing only; scripts are never executed. |
| `.sql` | SQL | A | Text editing only; SQL is not executed. |
| `.sv` | SystemVerilog | A | Text editing only; HDL is not simulated. |
| `.svelte` | Svelte Component | A | Text editing only; component is not executed. |
| `.swift` | Swift | A | Text editing only; code is never executed. |
| `.tf` | Terraform | A | Text editing only; Terraform is never executed. |
| `.tfvars` | Terraform Variables | A | Text editing only; Terraform is never executed. |
| `.toml` | TOML | A | Text editing only; schema validation is not automatic. |
| `.ts` | TypeScript | A | Text editing only; code is never executed. |
| `.tsx` | React TSX | A | Text editing only; component is not executed. |
| `.v` | Verilog | A | Text editing only; HDL is not simulated. |
| `.vhdl` | VHDL | A | Text editing only; HDL is not simulated. |
| `.vue` | Vue Component | A | Text editing only; component is not executed. |
| `.xml` | XML | A | Text editing only; schema validation is not automatic. |
| `.yaml` | YAML | A | Text editing only; schema validation is not automatic. |
| `.yml` | YAML | A | Text editing only; schema validation is not automatic. |
| `.cfg` | Config File | B | Safe text editing; no schema validation. |
| `.conf` | Configuration File | B | Safe text editing; no schema validation. |
| `.env` | Environment File | B | Text editing only; secrets are not masked yet. |
| `.gitignore` | Git Ignore | B | Text editing only. |
| `.inf` | Driver INF | B | Text preview only; OpenMe does not install drivers. |
| `.ini` | INI Config | B | Safe text editing; no schema validation. |
| `.jsonl` | JSON Lines | B | Line-based text preview; huge-file virtualization is limited. |
| `.log` | Log File | B | Text preview only; large log virtualization is still limited. |
| `.properties` | Java Properties | B | Text editing only; schema validation is not automatic. |
| `.txt` | Plain Text | B | Text preview and editing only; encoding detection is limited. |
| `.vbs` | VBScript | B | Text editing only; scripts are never executed. |
| `.asc` | ASCII Grid | C | Text preview only; raster visualization is not implemented. |
| `.bed` | BED Genomic Intervals | C | Text preview only; genomic analysis is not implemented. |
| `.cdl` | Circuit Description Language | C | Text preview only; circuit validation is not implemented. |
| `.def` | DEF | C | Text preview only; chip-design semantics are not implemented. |
| `.fa` | FASTA | C | Text preview only; bioinformatics analysis is not implemented. |
| `.faa` | FASTA Amino Acid | C | Text preview only; bioinformatics analysis is not implemented. |
| `.fasta` | FASTA | C | Text preview only; bioinformatics analysis is not implemented. |
| `.fastq` | FASTQ | C | Text preview only; bioinformatics analysis is not implemented. |
| `.fcpxml` | Final Cut Pro XML | C | XML text view; Final Cut timeline fidelity is not implemented. |
| `.fna` | FASTA Nucleotide | C | Text preview only; bioinformatics analysis is not implemented. |
| `.fq` | FASTQ | C | Text preview only; bioinformatics analysis is not implemented. |
| `.gff` | GFF Genome Annotation | C | Text preview only; genomic analysis is not implemented. |
| `.gtf` | GTF Genome Annotation | C | Text preview only; genomic analysis is not implemented. |
| `.ics` | Calendar | C | Text preview only; calendar UI is not implemented. |
| `.kml` | KML | C | XML text preview; map rendering is not implemented. |
| `.lef` | LEF | C | Text preview only; chip-design semantics are not implemented. |
| `.lib` | Liberty/Library | C | Text preview only; chip-design semantics are not implemented. |
| `.ma` | Maya ASCII | C | Text preview only; Maya scene fidelity is not implemented. |
| `.prj` | Projection Definition | C | Text preview only; CRS validation is not implemented. |
| `.sam` | SAM | C | Text preview only; bioinformatics analysis is not implemented. |
| `.sdc` | Synopsys Design Constraints | C | Text preview only; timing analysis is not implemented. |
| `.sdf` | Standard Delay Format | C | Text preview only; timing simulation is not implemented. |
| `.sp` | SPICE Netlist | C | Text preview only; circuit simulation is not implemented. |
| `.spef` | Standard Parasitic Exchange Format | C | Text preview only; signoff analysis is not implemented. |
| `.spice` | SPICE Netlist | C | Text preview only; circuit simulation is not implemented. |
| `.vcf` | vCard | C | Text preview only; contact UI is not implemented. |
| `.key` | Private Key | D | Text preview only; secrets are not masked yet. |
| `.pem` | PEM Certificate/Key | D | Text preview only; private key handling is not audited. |

### Video

| Extension | Format | Level | Boundary |
| --- | --- | --- | --- |
| `.mp4` | MP4 Video | B | Playback depends on codec support. |
| `.webm` | WebM Video | B | Playback depends on codec support. |
| `.m4v` | M4V Video | C | Playback depends on codec support. |
| `.mov` | QuickTime Video | C | Playback depends on codec support. |
| `.3gp` | 3GP Video | D | Recognized; playback is not guaranteed. |
| `.avi` | AVI Video | D | Recognized; playback is not guaranteed. |
| `.f4v` | Flash MP4 Video | D | Recognized legacy format; playback is not guaranteed. |
| `.flv` | Flash Video | D | Recognized legacy format; playback is not guaranteed. |
| `.m2ts` | M2TS Video | D | Recognized video container; codec support is not guaranteed. |
| `.mkv` | Matroska Video | D | Recognized; playback is not guaranteed. |
| `.mpeg` | MPEG Video | D | Recognized video container; codec support is not guaranteed. |
| `.mpg` | MPEG Video | D | Recognized video container; codec support is not guaranteed. |
| `.mts` | AVCHD Video | D | Recognized video container; codec support is not guaranteed. |
| `.mxf` | Material Exchange Format | D | Recognized professional video container; codec support is not guaranteed. |
| `.rm` | RealMedia | D | External open route only. |
| `.rmvb` | RealMedia Variable Bitrate | D | External open route only. |
| `.ts` | MPEG Transport Stream | D | Recognized; playback is not guaranteed. |
| `.wmv` | Windows Media Video | D | Recognized; playback is not guaranteed. |

## Rule

A format claim is valid only when it maps to a registry entry, a support level, and an explicit boundary.
