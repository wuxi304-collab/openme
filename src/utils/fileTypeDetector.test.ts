import { describe, expect, it } from "vitest";
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
  });

  it("detects design package and disk image formats without treating them as generic binary text", () => {
    expect(detectCategory("poster.psd")).toBe("design");
    expect(detectCategory("icon.ai")).toBe("design");
    expect(detectCategory("screen.sketch")).toBe("design");
    expect(detectCategory("mobile.apk")).toBe("package");
    expect(detectCategory("ios.ipa")).toBe("package");
    expect(detectCategory("installer.msi")).toBe("package");
    expect(detectCategory("ubuntu.iso")).toBe("disk");
    expect(detectCategory("vm.qcow2")).toBe("disk");
  });
});

describe("detectLanguage", () => {
  it("detects common development languages", () => {
    expect(detectLanguage("Dockerfile")).toBe("dockerfile");
    expect(detectLanguage("Makefile")).toBe("makefile");
    expect(detectLanguage("schema.graphql")).toBe("graphql");
    expect(detectLanguage("service.proto")).toBe("protobuf");
    expect(detectLanguage("infra.tf")).toBe("hcl");
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
