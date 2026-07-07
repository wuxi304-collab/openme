import { describe, expect, it } from "vitest";
import { FILE_FORMATS, getFileFormatByPath, getFileRegistryStats } from "../file-registry";
import { detectCategory, detectLanguage, isEditable } from "./fileTypeDetector";

describe("detectCategory", () => {
  it("detects built-in preview formats", () => {
    expect(detectCategory("quote.pdf")).toBe("pdf");
    expect(detectCategory("photo.avif")).toBe("image");
    expect(detectCategory("drawing.svg")).toBe("svg");
    expect(detectCategory("book.epub")).toBe("epub");
    expect(detectCategory("archive.zip")).toBe("archive");
  });

  it("detects Office and code formats", () => {
    expect(detectCategory("report.docx")).toBe("office");
    expect(detectCategory("data.xlsx")).toBe("office");
    expect(detectCategory("README.md")).toBe("markdown");
    expect(detectCategory("events.jsonl")).toBe("code");
    expect(detectCategory("Dockerfile")).toBe("code");
    expect(detectCategory("terraform/main.tf")).toBe("code");
  });

  it("detects engineering and CAD formats", () => {
    expect(detectCategory("part.step")).toBe("cad");
    expect(detectCategory("mesh.3mf")).toBe("cad");
    expect(detectCategory("plant.ifc")).toBe("cad");
    expect(detectCategory("layout.dwg")).toBe("dwg");
    expect(detectCategory("layout.dxf")).toBe("dwg");
    expect(detectCategory("board.gbr")).toBe("dwg");
    expect(detectCategory("model.sldprt")).toBe("cad");
  });

  it("detects design package and disk image formats without treating them as generic binary text", () => {
    expect(detectCategory("poster.psd")).toBe("design");
    expect(detectCategory("icon.ai")).toBe("design");
    expect(detectCategory("screen.sketch")).toBe("design");
    expect(detectCategory("mobile.apk")).toBe("package");
    expect(detectCategory("ios.ipa")).toBe("package");
    expect(detectCategory("installer.msi")).toBe("package");
    expect(detectCategory("mac.dmg")).toBe("disk");
    expect(detectCategory("ubuntu.iso")).toBe("disk");
    expect(detectCategory("vm.qcow2")).toBe("disk");
  });

  it("detects scientific GIS AI and data formats", () => {
    expect(detectCategory("map.geojson")).toBe("json");
    expect(detectCategory("model.onnx")).toBe("other");
    expect(detectCategory("weights.safetensors")).toBe("other");
    expect(detectCategory("sample.fastq")).toBe("code");
    expect(detectCategory("weather.nc")).toBe("other");
  });

  it("detects expanded professional and compound formats", () => {
    expect(detectCategory("bundle.tar.gz")).toBe("archive");
    expect(detectCategory("scan.nii.gz")).toBe("other");
    expect(detectCategory("app.jar")).toBe("package");
    expect(detectCategory("rushes.mxf")).toBe("video");
    expect(detectCategory("model.3dm")).toBe("cad");
    expect(detectCategory("genome.fq")).toBe("code");
    expect(detectCategory("shapefile.dbf")).toBe("other");
    expect(detectCategory("board.gtl")).toBe("dwg");
  });
});

describe("file registry", () => {
  it("contains a broad baseline registry with honest boundaries", () => {
    expect(FILE_FORMATS.length).toBeGreaterThan(270);
    expect(getFileFormatByPath("contract.docx")?.boundary).toContain("not source-application fidelity");
    expect(getFileFormatByPath("installer.exe")?.boundary).toContain("never executes");
    expect(getFileFormatByPath("drawing.dwg")?.supportLevel).toBe("D");
    expect(getFileFormatByPath("model.pkl")?.boundary).toContain("never unpickles");
  });

  it("computes category and support-level stats", () => {
    const stats = getFileRegistryStats();
    expect(stats.total).toBe(FILE_FORMATS.length);
    expect(stats.byCategory.code).toBeGreaterThan(30);
    expect(stats.byCategory.cad).toBeGreaterThan(30);
    expect(stats.bySupportLevel.D).toBeGreaterThan(100);
  });
});

describe("detectLanguage", () => {
  it("detects common development languages", () => {
    expect(detectLanguage("Dockerfile")).toBe("dockerfile");
    expect(detectLanguage("Makefile")).toBe("makefile");
    expect(detectLanguage("schema.graphql")).toBe("graphql");
    expect(detectLanguage("service.proto")).toBe("protobuf");
    expect(detectLanguage("infra.tf")).toBe("hcl");
    expect(detectLanguage("chip.sv")).toBe("systemverilog");
  });
});

describe("isEditable", () => {
  it("allows editing only safe text-like categories", () => {
    expect(isEditable("code")).toBe(true);
    expect(isEditable("markdown")).toBe(true);
    expect(isEditable("json")).toBe(true);
    expect(isEditable("csv")).toBe(true);
    expect(isEditable("package")).toBe(false);
    expect(isEditable("disk")).toBe(false);
    expect(isEditable("design")).toBe(false);
  });
});
