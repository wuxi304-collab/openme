import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const COMPONENT_PATH = resolve(__dirname, "..", "src", "components", "viewers", "ZipViewer.tsx");
const CSS_PATH = resolve(__dirname, "..", "src", "components", "viewers", "ZipViewer.css");

function readComponent(): string {
  return readFileSync(COMPONENT_PATH, "utf8");
}
function readCss(): string {
  return readFileSync(CSS_PATH, "utf8");
}

describe("ZipViewer — inner-file preview kinds", () => {
  const src = readComponent();

  it("classifies entry kinds by extension (image / pdf / text / nested-zip / unsupported)", () => {
    expect(src).toMatch(/const IMAGE_EXTS\s*=/);
    expect(src).toMatch(/const PDF_EXTS\s*=/);
    expect(src).toMatch(/const TEXT_EXTS\s*=/);
    expect(src).toMatch(/const NESTED_ZIP_EXTS\s*=/);
    expect(src).toMatch(/function inferEntryKind\b/);
    // image set must contain png/jpg/gif/bmp/webp/svg
    const m = src.match(/const IMAGE_EXTS\s*=\s*new Set\(\[([^\]]+)\]/);
    expect(m, "IMAGE_EXTS set literal must exist").toBeTruthy();
    for (const ext of ["png", "jpg", "gif", "bmp", "webp", "svg"]) {
      expect(m![1], `IMAGE_EXTS must include "${ext}"`).toContain(`"${ext}"`);
    }
  });

  it("uses URL.createObjectURL with a typed Blob for binary previews (image + pdf)", () => {
    expect(src).toMatch(/URL\.createObjectURL\(blob\)/);
    expect(src).toMatch(/new Blob\(\[bytes\],\s*\{\s*type:\s*mime\s*\}\)/);
  });

  it("revokes the prior blob URL on entry change or unmount", () => {
    // The useRef + URL.revokeObjectURL pattern keeps memory low and
    // prevents leaks between entries.
    expect(src).toMatch(/const blobUrlRef\s*=\s*useRef<string\s*\|\s*null>\(null\)/);
    expect(src).toMatch(/URL\.revokeObjectURL\(blobUrlRef\.current\)/);
    // cleanup useEffect for unmount
    expect(src).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?return\s*\(\)\s*=>\s*\{[\s\S]*?URL\.revokeObjectURL/);
  });

  it("renders <img> for images and <object> for PDFs", () => {
    expect(src).toMatch(/<img\s+src=\{preview\.url\}\s+alt=\{getFileName/);
    expect(src).toMatch(/<object\s+data=\{preview\.url\}\s+type=\{preview\.mime\}/);
  });

  it("surfaces a friendly notice for nested archives instead of trying to recurse", () => {
    expect(src).toMatch(/if\s*\(kind\s*===\s*"nested-zip"\)/);
    expect(src).toMatch(/setPreview\(\{\s*kind:\s*"nested-zip"/);
  });

  it("does not inject SVG as raw markup (uses <img> instead — security)", () => {
    // Sanity: there should be no dangerouslySetInnerHTML for any preview.
    expect(src).not.toMatch(/dangerouslySetInnerHTML/);
  });
});

describe("ZipViewer — preview CSS", () => {
  const css = readCss();

  it("styles the image preview with a checkered transparency backdrop", () => {
    expect(css).toMatch(/\.zip-preview-image-frame/);
    // The checkered pattern uses linear-gradient background — avoids
    // baking a tiny checker image (smaller css, scales freely).
    expect(css).toMatch(/\.zip-preview-image-frame\s*\{[\s\S]*?linear-gradient/);
  });

  it("constrains image preview to the preview pane without overflowing", () => {
    expect(css).toMatch(/\.zip-preview-image\s*\{[\s\S]*?max-width:\s*100%/);
    expect(css).toMatch(/\.zip-preview-image\s*\{[\s\S]*?max-height:\s*100%/);
  });

  it("offers a kind chip in the preview header (image vs pdf)", () => {
    expect(css).toMatch(/\.zip-preview-kind-chip/);
    expect(css).toMatch(/\.zip-preview-kind-chip\s*\{[\s\S]*?border-radius:\s*999px/);
  });

  it("renders PDF previews via <object> in a full-height region", () => {
    expect(css).toMatch(/\.zip-preview-pdf/);
    expect(css).toMatch(/\.zip-preview-pdf\s*\{[\s\S]*?width:\s*100%/);
  });
});
