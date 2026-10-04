# DWG Write-Back Plan — OpenMe as a minimal DWG text editor

**Date:** 2026-09-14
**Scope:** research + planning only. No application code was written and no app file was modified.
**Question:** how do we modify text entities in a DWG and write the result back out as DWG, in a local-first Windows desktop app?

---

## 0. What was verified on this machine (not assumed)

| Fact | How it was verified |
|---|---|
| No .NET SDK. Runtimes only: `Microsoft.NETCore.App 6.0.16`, `8.0.21`. `dotnet --list-sdks` empty; `C:\Program Files\dotnet\sdk` does not exist. | `dotnet --list-sdks`, `dotnet --list-runtimes`, `ls` |
| `cad-host/CadHost.csproj` targets `net8.0`, `OutputType=Exe`, single package ref `ACadSharp 3.6.35`, `InvariantGlobalization=true`. | read file |
| Shipped `cad-host/publish/` is a **self-contained** win-x64 publish (`includedFrameworks: Microsoft.NETCore.App 8.0.28`), not a single file. | `cad-host/publish/CadHost.runtimeconfig.json` |
| The bundled `ACadSharp.dll` (3.6.35) **contains a DWG writer**: types `DwgWriter`, `DwgWriterConfiguration`, `DxfWriter`, `SvgWriter`; stream writers `DwgStreamWriterAC12 / AC15 / AC18 / AC21 / AC24`; `ACadVersion` enum members up to `AC1032`. | string scan of `cad-host/publish/ACadSharp.dll` |
| ACadSharp upstream (current master) **documents DWG write** for AC1014/1015/1018/1024/1027/1032 (not AC1009, AC1012, AC1021). | https://github.com/DomCR/ACadSharp |
| ACadSharp is **MIT** (`Copyright (c) 2021 Albert Domenech`). | https://raw.githubusercontent.com/DomCR/ACadSharp/master/LICENSE |
| Latest published NuGet is **ACadSharp 3.7.1** (≈1 month ago); 3.6.51 (≈2 months); our 3.6.35 (≈3 months). | https://www.nuget.org/packages/ACadSharp/ |
| Sample `C:\Users\wuxi3\Desktop\ppt\12.栏杆节点图.dwg` is **AC1018 (AutoCAD 2004)**, 266,383 bytes; `--inspect` reports 194 entities / 50 layers / 45 blocks; entity mix `Insert 52, Line 48, LwPolyline 36, Circle 25, Hatch 19, Arc 10, TextEntity 3, Leader 1`. | first 6 bytes = `AC1018`; `CadHost.exe --inspect` |
| Current text extraction is **SVG-derived, not entity-derived**: `src/cad/extractCadText.ts` reads `<!--TYPE \| n-->` markers and assigns positional ids (`data-cad-text-id="N"`). There is **no DWG entity handle** anywhere in the pipeline. | read `src/cad/extractCadText.ts` |
| `src/cad/normalizeCadSvg.ts` already strips MTEXT format codes and guards >1 MB SVG with a bitmap path. | `AGENTS.md`, source tree |
| Known local hazards: Smart App Control has blocked freshly built DLLs; `cad-host/publish/CadHost.dll` silently goes stale vs `bin/Release/net8.0/win-x64/CadHost.dll` (symptom: `--render-svg` exits 0 with empty stdout). | `AGENTS.md` lines 28, 147–151 |

**Immediate consequence of the last three rows:** today's text inventory cannot address a DWG entity. "Replace text" can only be *simulated* on the SVG. A handle-authoritative text index is the hard prerequisite for any write-back route — including the commercial ones.

---

## 1. Recommendation

**Route C — ACadSharp, upgraded from 3.6.35 to the current 3.7.x, behind a `CadWriteEngine` interface that can later be re-pointed at ODA Drawings SDK.**

ACadSharp is the only route that is simultaneously (a) already vendored in this repo, (b) MIT with no licensing cost and no redistribution paperwork, (c) documented to *write* DWG — including AC1018, which is the format of our real sample — and (d) a drop-in for the existing `cad-host` .NET 8 sidecar, so no new runtime, no new IPC shape, and no change to the Electron packaging story. The fidelity risk is real and must be stated honestly: upstream has open, unresolved `DwgWriter` defects (§4.3), it is not a certified DWG clone, and files it writes will trigger AutoCAD's "Non Autodesk DWG" TrustedDWG notice — **but so will every non-RealDWG route, including ODA** (§3.2). The only route that avoids that notice is RealDWG, which costs $8,000/yr for ≤10,000 end users and is Windows-only C++/ .NET — money and lock-in that a "minimal text editor" should not spend on day one. Because write-back is inherently the riskiest operation in the product, the correct move is to spend effort on the **safe-save + audit flow** (§6), which is engine-independent and is what actually protects the user's drawing, and to keep the engine swappable. If ACadSharp's fidelity proves unacceptable on real customer drawings, the same interface lets us buy ODA Commercial ($3,000 first year / $2,250 recurring) later without a rewrite — whereas starting with ODA burns cash before we have proven anyone wants the feature.

---

## 2. Comparison table

|  | **C. ACadSharp (recommended)** | **A. ODA Drawings SDK** | **B. Autodesk RealDWG** | **D-1. Aspose.CAD** | **D-2. LibreDWG (write)** |
|---|---|---|---|---|---|
| **License cost** | **$0** — MIT ([LICENSE](https://raw.githubusercontent.com/DomCR/ACadSharp/master/LICENSE)) | Commercial **$3,000 yr 1 / $2,250 recurring**; Sustaining **$7,500 / $4,500**; Founding **$37,500 / $18,000**; Corporate: not publicly stated ([pricing](https://www.opendesign.com/pricing)) | **$8,000 USD / €7,500 per year** for up to 10,000 end users; above that: not publicly stated ([Tech Soft 3D](https://www.techsoft3d.com/products/realdwg/)). ADN membership for support is separate: **$1,750 / $3,000 / $5,500 per yr** ([ADN](https://aps.autodesk.com/developer/overview/autodesk-developer-network-membership)) | Developer Small Business **$799** (no OEM redistribution); Developer OEM **$2,397**; Developer SDK **$15,980**; Metered from **$1,999/mo** ([pricing](https://purchase.aspose.com/pricing/cad/net/)) | $0, but **GPLv3** |
| **DWG write versions** | AC1014, AC1015, **AC1018**, AC1024, AC1027, AC1032. **No** AC1009 / AC1012 / **AC1021** ([compat table](https://github.com/DomCR/ACadSharp)) | "Save to any supported version"; supported: AC1009–AC1021, AC1024, AC1027, AC1032 (through AutoCAD 2024/2025) ([Drawings SDK](https://www.opendesign.com/products/drawings)) | R14 (AC1014) through the current AutoCAD release ([RealDWG API](https://aps.autodesk.com/developer/overview/realdwg-api)) | **Not publicly stated for DWG save** — must contact vendor. Aspose.CAD is marketed as read/convert/edit; DWG *write* is not a documented headline capability | Experimental, limited versions ([libredwg](https://github.com/LibreDWG/libredwg)) |
| **Fidelity risk** | **High-but-bounded.** Open upstream defects (§4.3). Not TrustedDWG. | **Low.** De-facto industry second source; used by Gräbert ARES, Safe Software FME. Still not TrustedDWG. | **Lowest.** Autodesk's own code; TrustedDWG. | Unknown for DWG write; unverified. | Very high (experimental writer). |
| **Effort to integrate** | **Low.** Already vendored; add 3 CLI verbs to `cad-host/Program.cs`; bump NuGet to 3.7.1. Blocked only on installing the .NET SDK (§5). | **Medium-high.** New native + SWIG .NET dependency, compile-time activation, new build/packaging path, ~250 MB extra payload, 60-day trial then paid. | **High.** Windows-only, 64-bit-only, C++/ .NET, VS2022/VS2026 toolchain, licensed through Tech Soft 3D, ships native runtimes. | Medium — but likely cannot do what we need. | Very high: C → WASM/native bridge, GPLv3 contamination. |
| **Redistribution** | MIT: unrestricted; commercial use, distribution and sublicensing allowed. No notice obligations beyond MIT. | Commercial tier: "**Commercial distribution w/100 seat limit**" — **trials count toward the 100**. >100 seats requires Sustaining ("unlimited commercial distribution"). Requires the ODA copyright notice in product documentation. Compile-time activation only; no developer-count limit. ([FAQ](https://www.opendesign.com/faq/business-questions)) | "Royalty-free distribution model" (Tech Soft 3D). Windows-only, 64-bit-only. | OEM redistribution **only** on Developer OEM / SDK / Site OEM / Metered OEM tiers. Small Business forbids it. | GPLv3 → source-disclosure obligations for anything linked; unacceptable for a commercial desktop app. |
| **Free evaluation** | Yes — it is free, permanently. | Yes — **60-day trial**, "1 license per company, 1 desktop", Windows 64-bit/Linux/macOS; **cannot be shipped**. ([trial](https://www.opendesign.com/free-trial)) | Yes — evaluation via Tech Soft 3D; terms not publicly stated. | Free temporary license (Small Business / OEM tiers) | N/A |

---

## 3. Route notes

### 3.1 Route A — ODA Drawings SDK

- **Licensing.** Membership, not a per-seat SDK purchase. Public prices: Commercial $3,000 first year + $2,250/yr; Sustaining (a.k.a. Pro on the pricing page) $7,500 + $4,500/yr; Founding (a.k.a. Enterprise) $37,500 + $18,000/yr; Corporate "Contact us". The DWG/DGN/IFC/STEP/3D-PDF/Architecture "Core package" is included at every tier. ([opendesign.com/pricing](https://www.opendesign.com/pricing))
- **The 100-seat trap.** ODA's own FAQ: *"A Commercial membership is limited to distribution of 100 seats... both paid licenses and trial/evaluation licenses are included in the 100 seat limit. If you are distributing more than 100, then it needs to be a Sustaining Membership."* For a consumer/prosumer desktop app, 100 seats including trials is essentially a non-starter — budget $4,500/yr recurring. ([FAQ](https://www.opendesign.com/faq/business-questions))
- **Other obligations.** Mandatory notice in product documentation: *"This application incorporates Open Design Alliance software pursuant to a license agreement with Open Design Alliance..."*. Activation is compile-time only. No cap on developer count. Resellers cannot bundle membership — the end customer must become a member — but a normal ISV selling its own app is not a reseller.
- **Capability.** Read 100% of DWG including xdata; edit layers and objects; "Save to any supported version" across AC1009–AC1032. Bindings: C++ native plus **SWIG-generated** .NET (and Python/Java) wrappers — the trial archive ships samples *"in Exe (C++) and Swig (.NET)"*, which confirms the .NET layer is SWIG, not a hand-written managed API. Expect to ship native DLLs + managed wrappers, x64.
- **Trial.** 60 days, 1 license per company, 1 desktop, no redistribution. Useful only to *prove* fidelity before buying.
- **Verdict.** Best fidelity-per-dollar if and only if we can justify $2,250–$4,500/yr forever, and we accept the 100-seat ceiling. Keep as the upgrade path.

### 3.2 Route B — Autodesk RealDWG

- **Licensing.** Not bought from Autodesk directly: *"RealDWG developer toolkit licensing is handled globally by our partner Tech Soft 3D."* Public price: **$8,000 USD / €7,500 per year, up to 10,000 end users**; above 10,000 end users is not publicly stated. ADN membership (support, betas, Autodesk software for development) is a separate $1,750–$5,500/yr, with a free tier for startups (up to 3 years). ([APS](https://aps.autodesk.com/developer/overview/realdwg-api), [Tech Soft 3D](https://www.techsoft3d.com/products/realdwg/), [ADN](https://aps.autodesk.com/developer/overview/autodesk-developer-network-membership))
- **Versions / runtime.** Read+write from AutoCAD R14 (AC1014) through the current release. C++ and .NET. **Windows-only, 64-bit-only.** RealDWG 2026 wants VS2022/VS2026 + .NET 8/10; RealDWG 2027 wants VS2026 + .NET 10. That is a heavy toolchain to keep alive for a sidecar.
- **TrustedDWG — the one thing only RealDWG buys you.** AutoCAD/LT analyse each file on open: *"The function checks to see if the DWG file was last saved with an Autodesk product or by a software developer who is licensed to use the RealDWG toolkit."* Otherwise the user sees: **"Non Autodesk DWG. This DWG file was saved by a software application that was not developed or licensed by Autodesk. Autodesk cannot guarantee the application compatibility or integrity of this file."** Visibility is controlled by the `DWGCHECK` system variable and can be suppressed by the user/organisation. ([Autodesk Developer Blog, 2022](https://blog.autodesk.io/how-to-find-if-drawing-is-a-trusteddwg/))
  - *Inference, flagged as such:* because the check keys on "licensed to use RealDWG", ODA-written and ACadSharp-written files will both trip it. Neither open-source nor ODA routes avoid the notice. This is a **warning, not a block** — the file still opens — and it is dismissible via `DWGCHECK`. It should be disclosed in the product UI, not treated as a blocker.
- **Verdict.** Technically the best, commercially the worst fit: highest cost, Windows-only hard dependency, an annual meter that restarts, and a toolchain that pins us to specific Visual Studio versions. Not suitable for a small product whose core value is "change 12 strings in a title block". Revisit only if an enterprise customer demands TrustedDWG output and will pay for it.

### 3.3 Route C — ACadSharp (the serious evaluation)

**Can it write DWG?** Yes. Not inferred — verified twice:
1. The bundled `ACadSharp.dll` (3.6.35) physically contains `DwgWriter`, `DwgWriterConfiguration`, `DwgStreamWriterAC12/AC15/AC18/AC21/AC24`, `DwgFileHeaderWriterAC15/AC18/AC21`, `DwgObjectWriter`, `DwgSectionDefinition`-era writers, plus `ICadWriter`/`CadWriterBase`.
2. Upstream README *and* the NuGet package page both list "Write Dwg files" as a feature and publish an explicit compatibility matrix.

**Which versions can it write?** Per upstream (current master, and identically on the 3.7.1 package page):

| | AC1009 | AC1012 | AC1014 | AC1015 | **AC1018** | AC1021 | AC1024 | AC1027 | AC1032 |
|---|---|---|---|---|---|---|---|---|---|
| DxfReader | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| DxfWriter | ✘ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| DwgReader | ✘ | ✘ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| **DwgWriter** | ✘ | ✘ | ✔ | ✔ | **✔** | **✘** | ✔ | ✔ | ✔ |

Source: <https://github.com/DomCR/ACadSharp> (accessed 2026-09-14).

Two things follow:
- **AC1021 (AutoCAD 2007) is a write hole.** Any 2007 drawing must be refused for edit, or written out as a different version with an explicit, user-confirmed conversion.
- The bundled 3.6.35 predates the current table. Its stream-writer class names stop at `AC24`, so **we must not assume 3.6.35 writes AC1027/AC1032** — that must be probed empirically after the first successful rebuild (§5.4). This is another reason to bump the package.

**Maturity for round-tripping an existing DWG — the honest caveats.** Upstream is single-maintainer and ships frequently (3.7.1 was ~1 month ago). Open and recent `DwgWriter` issues (GitHub, `DomCR/ACadSharp`, accessed 2026-09-14) that bear directly on our use case:

| Issue | State | Why it matters to OpenMe |
|---|---|---|
| [#956](https://github.com/DomCR/ACadSharp/issues/956) Writing DWG below AC1018 → AutoCAD/DWG TrueView shows a *recover* dialog. Maintainer: *"the recover message for version before AC1018 is a known issue that I haven't managed to solve"* | closed (workaround only) | **We must not downgrade a file's version on save.** AC1018+ only. |
| [#1102](https://github.com/DomCR/ACadSharp/issues/1102) Generated DWG opens as a black screen in AutoCAD until the user runs Zoom Extents | **open** | Written extents/initial view may be wrong. Our audit must check extents and, if needed, set them explicitly. |
| [#1234](https://github.com/DomCR/ACadSharp/issues/1234) `DwgWriter` silently loses SummaryInfo values ≥16,383 chars; larger values corrupt the file for ODA-based readers | **open** | Files with big metadata blocks risk corruption. Quarantine on document-property size. |
| [#1181](https://github.com/DomCR/ACadSharp/issues/1181) `writeBlockHeader` throws `ArgumentOutOfRangeException` on anonymous blocks with name length < 2 | **open** | Our sample has **52 `Insert`s and 45 blocks, many anonymous (`*U7`, `*U11`, …)**. This is a live crash path for our exact corpus. |
| [#1161](https://github.com/DomCR/ACadSharp/issues/1161) Inverted LTYPE handle condition corrupts AC1014 (R14) output | **open** | Reinforces "never target below AC1018". |
| [#1124](https://github.com/DomCR/ACadSharp/issues/1124) `ACAD_IMAGE_DICT` not written out | closed | Round-trip drops image dictionaries — a silent data-loss class we must surface in the audit. |
| [#1074](https://github.com/DomCR/ACadSharp/issues/1074) DWG TrueView crashes on Realistic/Conceptual visual style with ACadSharp-written DWG (missing VisualStyle object) | closed | Visual-style objects are a known regression surface. |
| [#955](https://github.com/DomCR/ACadSharp/issues/955) Text style font renamed to `arial_1.ttf` after read/write | closed | **Directly relevant**: a text edit can perturb styles/fonts. Audit must compare style tables. |
| [#1194](https://github.com/DomCR/ACadSharp/issues/1194) Reader drops ATTRIB/ATTDEF/TEXT stored with height 0 | closed | Height-0 text is real in Chinese title blocks. Verify against our corpus. |

Also visible in the DLL: `KeepUnknownEntities`, `KeepUnknownNonGraphicalObjects`, `CadUnknownEntityTemplate`, `ProxyUnknown37` — i.e. ACadSharp *does* have a notion of preserving unmodelled/unknown objects, but it is opt-in configuration and is exactly where silent loss occurs.

**Not yet verified for our corpus:** proxy objects (SolidWorks/CAXA/GstarCAD extension blocks — `AGENTS.md` says our regression drawings contain them), XREFs (our sample has layer `0-XREF-A` and `A区4-5墙身$0$...` xref-dependent layers), and paperspace layouts. These are the highest-risk areas and are the reason §6 requires an audit gate, not just a write.

**Risk assessment of the .NET SDK blocker:** low *technical* risk, real *logistical* risk. Installing the SDK is a 5-minute download. The genuine risks are (a) this machine's Smart App Control has previously blocked freshly built DLLs, (b) `publish/` and `bin/` drift silently, and (c) NuGet restore needs network access to fetch ACadSharp. All three are manageable and are spelled out in §5. This is not a reason to buy a $4,500/yr SDK.

### 3.4 Route D — other options

- **Teigha / DWGdirect** — legacy brand names for what is now the ODA Drawings SDK. Not a separate option.
- **Aspose.CAD for .NET** — real prices ($799 / $2,397 / $15,980 perpetual; metered from $1,999/mo), but it is fundamentally a **converter/renderer**. DWG *write-back* is not a publicly documented capability; the pricing page's own feature matrix is about conversion to PDF/raster/DXF. Cost is real, the license tiers are a maze (only OEM/SDK tiers permit redistribution), and it does not solve fidelity better than ODA. **Not suitable** — would need explicit vendor confirmation before consideration.
- **LibreDWG (write)** — the WASM build we already ship is read-only (38 exports: enums + `LibreDwg`, `createModule`, `dwgCodePageToEncoding`, `dwgVersions`). Upstream write support is explicitly *"an experimental feature"* (disabled by default via `--disable-write`), and the library is **GPLv3** — linking it into a commercial desktop product is a licensing problem, not an engineering one. **Not suitable.**
- **ODA File Converter** (already probed by `electron/main.js`) — free, but conversion-only. No entity editing. Useful *only* as an audit/version-normalisation utility if present on the user's machine.
- **`accoreconsole.exe` (AutoCAD Core Console)** — ships inside an **AutoCAD 2013+ installation** (we could not confirm it ships with DWG TrueView; treat as unverified). Can run scripts that edit and save DWG, and would give true TrustedDWG output. But it requires a licensed AutoCAD on the user's machine, so it cannot be the engine for a standalone product. `AGENTS.md` already flags it as an optional highest-fidelity path — keep it as a **user-supplied, opt-in** engine, never a default.
- **Cloud conversion services** — violate the local-first, no-backend constraint and put customer drawings on someone else's server. **Rejected.**

---

## 4. Integration steps for the recommended route (C)

### 4.1 Design principle: an engine interface, not an engine

Introduce a single seam in the main process — `CadWriteEngine` — with these verbs, implemented today by `cad-host` and tomorrow by ODA or RealDWG if we ever pay for one:

| Verb | Purpose |
|---|---|
| `inspect(path)` | exists today |
| `renderSvg(path)` | exists today |
| `dumpText(path)` | **new** — handle-authoritative text inventory |
| `applyText(path, plan, outPath)` | **new** — write a modified copy |
| `audit(path)` / `diff(a, b)` | **new** — invariant comparison for the safe-save gate |

Every UI feature is written against this interface. The "engine" is a child process and a stdout contract — so swapping engines is a packaging change, not a rewrite.

### 4.2 The prerequisite nobody can skip: handle-authoritative text

`src/cad/extractCadText.ts` derives text from the SVG with **no entity identity** (positional `data-cad-text-id="N"`, kind inferred from `<!--TYPE | n-->` markers). That is fine for *viewing* and *searching*, and useless for *writing*. Before any write-back ships, `cad-host` must expose a `--dump-text` that walks `CadDocument` and returns, per text-bearing entity:

- `handle` (stable DWG handle — the only safe edit address),
- `owner` handle + `ownerName` (ModelSpace / `*Paper_Space` / a `BlockRecord` name — **block-definition text and ATTRIBs included**),
- `type` (`TEXT` / `MTEXT` / `ATTRIB` / `ATTDEF` / `DIMENSION` override text),
- `value`, `style`, `height`, `layer`, `insertionPoint`, `rotation`, `isConstant`/`isInvisible` for attributes.

Why block recursion is not optional: our sample has only **3 model-space `TextEntity`** but **52 `Insert`s across 45 blocks**. In drawings like this, essentially all user-visible text lives inside block definitions and attribute references. A model-space-only editor would appear to find almost nothing. This also means one edit may change *N* rendered labels (block is inserted 20 times) — the UI must say "1 entity, 20 occurrences".

### 4.3 Concrete .NET SDK steps

**4.3.1 Install the SDK (one-time, on a build machine).**

`cad-host/CadHost.csproj` declares `<TargetFramework>net8.0</TargetFramework>` and the shipped layout is a **self-contained win-x64** publish, so:

- **Required:** **.NET SDK 8.0 (LTS)** — the exact match for the TFM.
  - Download: <https://dotnet.microsoft.com/download/dotnet/8.0> → ".NET SDK 8.0.x" (x64), or
  - `winget install --id Microsoft.DotNet.SDK.8 -e`
- **Also acceptable:** .NET SDK 9 or 10 (they can build `net8.0` and will fetch the 8.0 reference/runtime packs from NuGet). Prefer 8.0 to keep the build reproducible against the shipped `8.0.28` runtime.
- **Not sufficient:** the installed 8.0.21 *runtime*. A runtime cannot compile. This is exactly the current gap.
- Note: .NET 8 LTS mainstream support ends **2026-11-10**. Before that date, plan either a move to `net10.0` (LTS) or a deliberate stay on 8 — self-contained publishing means the app does not depend on the user's machine either way.

Verify:
```bash
dotnet --list-sdks      # must print 8.0.x (or 9/10)
dotnet --list-runtimes
```

**4.3.2 Bump ACadSharp (recommended) and build.**

```bash
cd cad-host
dotnet add package ACadSharp --version 3.7.1     # or the newest; needs network for NuGet restore
dotnet restore CadHost.csproj
dotnet build CadHost.csproj -c Release
```

**4.3.3 Publish — and publish *into* `publish/` (this is the step that fixes the known drift bug).**

```bash
dotnet publish CadHost.csproj -c Release -r win-x64 --self-contained true \
  -p:PublishSingleFile=false -p:PublishTrimmed=false -o publish
```

Publishing straight to `publish/` regenerates `CadHost.exe`, `CadHost.dll`, `CadHost.deps.json`, `CadHost.runtimeconfig.json`, `ACadSharp.dll` and the whole self-contained runtime in one shot, which removes the `bin/` ↔ `publish/` copy step that `AGENTS.md` warns about.

**4.3.4 Verify the publish (mandatory, every time).**

```bash
# 1. md5 parity — the exact failure AGENTS.md records
md5sum cad-host/bin/Release/net8.0/win-x64/CadHost.dll cad-host/publish/CadHost.dll

# 2. semantic smoke test
./cad-host/publish/CadHost.exe --inspect "C:/Users/wuxi3/Desktop/ppt/12.栏杆节点图.dwg"

# 3. render smoke test — must be NON-EMPTY (stale-DLL symptom is exit 0 + 0 bytes)
./cad-host/publish/CadHost.exe --render-svg "C:/Users/wuxi3/Desktop/ppt/12.栏杆节点图.dwg" | head -c 200

# 4. regression: the three drawings named in AGENTS.md
```

**4.3.5 Smart App Control / SmartScreen hazard (recorded in `AGENTS.md`).**

This machine's Smart App Control has previously blocked freshly built DLLs. Consequences and rules:
- **Do not** work around it by moving the build output to different directories — `AGENTS.md` explicitly forbids that and it does not help.
- After a rebuild, **run the binary once on this machine** and confirm `CadHost.exe --inspect` returns JSON, before assuming the build is good.
- The durable fix for a shipped product is **Authenticode signing** of `CadHost.exe` and its DLLs (a code-signing certificate is a real cost — budget for it before public release), or shipping the sidecar only inside a signed installer.
- Until then: treat "the binary runs on a clean target machine" as an explicit release-gate checkbox, not an assumption.

**4.3.6 Add a build script + CI note.**

Add `scripts/build-cad-host.cmd` (and a `.sh` equivalent) containing 4.3.2–4.3.4, and make `npm run dist` fail loudly if `cad-host/publish/CadHost.exe` is missing or if the md5 check fails. Today nothing enforces this.

### 4.4 The three new CadHost verbs

Contract shape (JSON), implemented inside the existing `--verb` CLI pattern in `cad-host/Program.cs` and consistent with the existing camelCase `JsonSerializerOptions`:

- `--dump-text <file>` → `{ schemaVersion, engine, source:{version, …}, items:[{handle, owner, ownerName, type, value, style, height, layer, pt:{x,y,z}, rotation, flags}], quarantine:[…] }`
- `--apply-text <file> <planJsonFile> <outFile>` → writes **only** to `outFile`; returns `{ ok, written, applied:[{handle, before, after}], skipped:[…], invariants:{…}, notifications:[…] }`. It must **never** be given the source path as `outFile`.
- `--audit <fileA> <fileB>` → `{ equal, version:{a,b}, entityCount:{a,b}, layerCount:{a,b}, blockCount:{a,b}, textDelta:[…], extents:{a,b}, warnings:[…] }`

The `apply` implementation should use `DwgReader.Read` → mutate entity `Value`s addressed by handle → `DwgWriter.Write` with the **source document's own `ACadVersion`** (never a downgrade), with `OnNotification` captured into the response so reader/writer warnings are surfaced to the UI rather than swallowed.

### 4.5 Version-capability probe (do this first, after the rebuild)

Run once and record the results in this document: for each input version we can obtain (AC1014/1015/1018/1021/1024/1027/1032), do read → write → re-read, and log: success/failure, whether the output version matches the input, entity count delta, and whether `--audit` reports clean. Any version that fails goes on the **quarantine list** and the app refuses to edit it. This converts an unverified assumption into a table.

---

## 5. Safe-save flow (engine-independent — build this regardless)

DWG is not Word. A corrupted block, proxy object or XREF costs the user far more than a lost paragraph. The following is the required flow.

### Step 0 — Open read-only, fingerprint the original
Open with `FileAccess.Read, FileShare.Read`. Compute `sha256`, `size`, and read the 6-byte DWG magic for the true version (do **not** trust the extension — our `--inspect` currently reports `version: null`, so read the header directly).

### Step 1 — Preflight gate (refuse, don't guess)
Block editing and show a specific reason when:
- DWG version is **not in the writable set** (probe table, §4.5) — e.g. AC1021, or anything pre-AC1018.
- The reader emitted fatal notifications, or `entityCount`/`blockCount` looks inconsistent.
- Proxy / unknown custom objects are present above a threshold (`AGENTS.md`: our regression drawings contain SolidWorks/CAXA/GstarCAD extension blocks).
- The file has attached XREFs (our sample has `0-XREF-A` layers): **allow editing the host drawing, but warn** that the edited text may be part of a linked reference and that the reference is untouched.
- The file is read-only, locked by another process (AutoCAD holding `~$lock`), or over the size guard.
- AC1018 rules: never write below the source version (issue #956).

### Step 2 — Build an explicit, reviewable edit plan
`[{ handle, owner, type, before, after, occurrences }]`. Show it. Require confirmation. One plan = one atomic write.

### Step 3 — Write to a temp file, never to the source
- Target directory: a temp folder **on the same volume** as the final destination (so the final move is a rename, not a copy).
- Write `<tmp>/<name>.openme-<pid>-<guid>.dwg` → flush to disk.

### Step 4 — Default to "Save As", with a non-colliding default name
- Default target: `<original-dir>/<name>.openme.dwg`; if it exists, append `-1`, `-2`, …
- **The original file is never opened for writing and is never truncated.**
- "Replace original" is a separate, secondary, explicitly-confirmed action (Step 7) — never the default.

### Step 5 — Audit / repair gate (the write does not count until this passes)
1. **Structural re-open.** Launch a **fresh** `CadHost.exe` process and `--inspect` the output. Hard fail if it throws or returns nothing.
2. **Invariant compare** (`--audit original output`): DWG version equal; `entityCount` equal; `layerCount` equal; `blockCount` equal; extents equal within tolerance; **text inventory differs by exactly the planned deltas and nothing else**.
3. **Style/table compare.** Compare the text-style and layer tables (issue #955 renames fonts on round-trip). Any style drift = warning; any *loss* = fail.
4. **External repair check, if available.** If `ODAFileConverter.exe` (already probed in `main.js`), `accoreconsole.exe`, or DWG TrueView is installed on the user's machine, run a repair/audit pass on the output and parse its log. A "recovered / repaired" verdict from a second engine must be treated as a **failure with a clear message**, not a success — recovery means we wrote something questionable.
5. **Size sanity.** Output size within a sane band of the original (a 40% collapse means whole sections were dropped).

### Step 6 — Commit or roll back
- **Pass:** rename the temp file onto the final path (atomic on the same volume).
- **Fail:** delete the temp file, leave the original byte-identical, and show a diff report with the actual deltas. Never leave a partially written file under the target name.

### Step 7 — Optional "Replace original" (explicit, second confirmation)
Only after Step 5 passed: create `<original>.openme-backup` (or a timestamped sidecar) **before** the atomic replace, so the pre-edit bytes are always recoverable. Report both paths in the UI.

### Step 8 — Save report (always shown)
"12 of 12 replacements applied · 3 skipped (block attribute is constant) · version AC1018 preserved · entity count 194 → 194 · blocks 45 → 45 · 2 warnings: image dictionary dropped, text style `HZTXT` renamed". If we cannot produce this report, we must not claim the save succeeded.

### Step 9 — Telemetry-free local log
Append a machine-local, user-visible save log (path + sha256 before/after + plan + audit result). This is the only defensible answer when a user says "your app broke my drawing".

---

## 6. Phased roadmap

### Phase 0 — Unblocked **now**, zero external dependency, no .NET SDK
Everything here touches only the renderer/UI, so it can land today.

1. **Find & preview-replace over the SVG** (dry run): search + highlight + "N matches, M would change" using the existing `extractCadText.ts`. Clearly labelled **preview only, not saved** — this is the honest version of "replace" and it is genuinely useful.
2. **Export text report** (CSV/JSON) of the extracted inventory, labelled "derived from the drawing view; not entity-authoritative".
3. **Safe-save UX shell + audit scaffolding**, built against the `CadWriteEngine` interface with a stub engine that returns "engine not available". All the modals, confirmations, diff views and failure states get designed and tested *before* an engine exists.
4. **`scripts/build-cad-host.cmd`** + md5-parity check + a `npm run dist` guard, so the moment an SDK exists the build is reproducible.
5. **Preflight report UI** ("can this drawing be edited?") wired to data we already have: DWG version from the file header, entity/layer/block counts, Insert-vs-TextEntity ratio, XREF-layer heuristics, proxy-object hints. Start showing it read-only.
6. **Decision gate:** install the .NET SDK 8.0 (§4.3.1) and complete one verified publish.

### Phase 1 — Unlocked once the .NET SDK is installed
7. Bump to ACadSharp 3.7.1; rebuild + publish + pass the smoke tests (§4.3.4).
8. Run the **version-capability probe** (§4.5) and publish the quarantine list.
9. Implement `--dump-text` (with block recursion + ATTRIBs). Replace the SVG-derived inventory as the *editing* source of truth; keep the SVG index for *hit-testing/highlighting* and join them on value+geometry.
10. Implement `--apply-text` and `--audit`.
11. Wire the real safe-save flow (§5) end-to-end. **Ship as "Save As" only** — no "replace original" in v1.

### Phase 2 — Hardening before anyone trusts it
12. Regression corpus: the three drawings in `AGENTS.md` + the 栏杆节点图 sample + a deliberately nasty set (AC1021 input, XREF-heavy, anonymous blocks with 1-char names, height-0 text, huge SummaryInfo, embedded images, paperspace layouts).
13. **External verification on a machine that has AutoCAD / DWG TrueView / ODA File Converter.** We cannot self-certify DWG validity from ACadSharp's own reader alone — a second engine must open every output. This is a hard release gate.
14. Quarantine rules from the corpus results; explicit "this drawing is read-only for editing" messaging.
15. Performance: `DwgWriter` is O(blocks × entities) (upstream issue #1167); measure on large drawings and add a progress UI + size guard.
16. Decide on **Authenticode signing** for the sidecar (Smart App Control blocker) before public distribution.

### Phase 3 — Conditional escalation (only if fidelity complaints justify it)
17. If ACadSharp output fails external verification on real customer drawings: take the **ODA 60-day trial**, implement `CadWriteEngine` over ODA's SWIG .NET wrappers, and re-run the same corpus. Buy Commercial ($3,000 / $2,250) only if the 100-seat ceiling is acceptable; otherwise Sustaining ($7,500 / $4,500).
18. Only for an enterprise customer who demands TrustedDWG: evaluate RealDWG via Tech Soft 3D ($8,000/yr for ≤10k end users, Windows-only).
19. Keep `accoreconsole.exe` as an opt-in "use my installed AutoCAD" engine for power users.

---

## 7. Open questions / still to confirm

1. **Does ACadSharp 3.6.35 write AC1027/AC1032, or only up to AC1024?** The DLL's stream-writer names stop at `AC24` while current upstream claims AC1027/1032. Must be answered by the §4.5 probe. (Mitigation: upgrade to 3.7.1.)
2. **AC1021 (AutoCAD 2007) handling.** Read is supported, write is not. Do we refuse, or offer an explicit user-confirmed conversion to AC1018/1024? Refusing is safer; confirm this is acceptable product-wise.
3. **Anonymous-block crash (#1181).** Our sample is full of `*U7`/`*U11`-style blocks and the crash path is *name length < 2*. Needs a reproduction test against the real corpus before any write-back ships.
4. **Proxy / custom objects.** What fraction of target drawings carry CAXA/GstarCAD/SolidWorks proxy entities, and does ACadSharp preserve them (`KeepUnknownEntities`)? Unverified for our corpus.
5. **XREF semantics.** If the text the user wants to change lives in an XREF, we cannot edit it from the host drawing. Do we detect and explain this, or refuse?
6. **RealDWG pricing above 10,000 end users** — not publicly stated; must contact Tech Soft 3D. (Probably irrelevant unless we escalate.)
7. **Aspose.CAD DWG write capability** — not publicly documented; vendor confirmation required before any consideration. Currently judged unsuitable.
8. **`accoreconsole.exe` with DWG TrueView** — we could not confirm whether Autodesk's free DWG TrueView ships `accoreconsole.exe`. If it does, it becomes a much more attractive free-but-optional fidelity path. Needs verification on a machine with TrueView installed.
9. **ODA seat accounting.** If we ever ship ODA: does the 100-seat Commercial cap count *installs* or *licences*, and do anonymous free trials really consume seats? The FAQ says yes for trials — worth written confirmation from ODA before committing.
10. **Authenticode certificate cost** for signing the sidecar — not yet researched; needed to unblock Smart App Control for public distribution.
11. **Does the product even need in-place DWG write-back for v1?** A cheaper MVP is "edit → export DXF/SVG + a change report" and letting the user apply it in their CAD. Worth a product decision before spending Phase 1–2 effort.

---

## 8. Sources consulted (all accessed 2026-09-14)

- ACadSharp repository / compatibility matrix — <https://github.com/DomCR/ACadSharp>
- ACadSharp documentation (same matrix) — <https://domcr.github.io/ACadSharp/index.html>
- ACadSharp on NuGet (version history, latest 3.7.1) — <https://www.nuget.org/packages/ACadSharp/>
- ACadSharp LICENSE (MIT) — <https://raw.githubusercontent.com/DomCR/ACadSharp/master/LICENSE>
- ACadSharp issue tracker (DwgWriter defects: #956, #1074, #1102, #1124, #1161, #1181, #1191, #1194, #1234) — <https://github.com/DomCR/ACadSharp/issues>
- ODA Pricing — <https://www.opendesign.com/pricing>
- ODA Drawings SDK — <https://www.opendesign.com/products/drawings>
- ODA Free Trial — <https://www.opendesign.com/free-trial>
- ODA FAQ: Business questions (100-seat limit, copyright notice, activation) — <https://www.opendesign.com/faq/business-questions>
- Autodesk RealDWG API overview (licensing via Tech Soft 3D, versions, system requirements) — <https://aps.autodesk.com/developer/overview/realdwg-api>
- Tech Soft 3D RealDWG pricing — <https://www.techsoft3d.com/products/realdwg/>
- Autodesk Developer Network membership pricing — <https://aps.autodesk.com/developer/overview/autodesk-developer-network-membership>
- Autodesk Developer Blog: TrustedDWG — <https://blog.autodesk.io/how-to-find-if-drawing-is-a-trusteddwg/>
- Aspose.CAD for .NET pricing — <https://purchase.aspose.com/pricing/cad/net/>
- LibreDWG (write support experimental, GPLv3) — <https://github.com/LibreDWG/libredwg>

Local, verified by inspection: `cad-host/CadHost.csproj`, `cad-host/Program.cs`, `cad-host/publish/CadHost.runtimeconfig.json`, `cad-host/publish/CadHost.deps.json`, `cad-host/publish/ACadSharp.dll` (string scan), `electron/main.js` (lines 180–240), `src/cad/extractCadText.ts`, `AGENTS.md`.
