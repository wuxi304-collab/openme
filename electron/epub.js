const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const { DOMParser } = require("@xmldom/xmldom");

// epub.js throws a tagged error so the main IPC handler can convert it into
// the localized { success: false, code, params, message } shape without
// needing to know the precise failure reason. The caller does
// `catch (e) { return e && e.code ? ipcError(e.code, e.params, e.message) : ipcError(...) }`.
function epubError(code, params) {
  const err = new Error(code);
  err.code = code;
  err.params = params || {};
  return err;
}

async function readEpub(filePath) {
  const stats = await fs.promises.stat(filePath);
  if (stats.size > 100 * 1024 * 1024) throw epubError("EPUB_TOO_LARGE");
  const archive = await JSZip.loadAsync(await fs.promises.readFile(filePath));
  const containerFile = archive.file("META-INF/container.xml");
  if (!containerFile) throw epubError("EPUB_MISSING_CONTAINER");
  const container = new DOMParser().parseFromString(await containerFile.async("string"), "application/xml");
  const rootfile = Array.from(container.getElementsByTagName("*")).find((node) => node.localName === "rootfile");
  const packagePath = rootfile?.getAttribute("full-path");
  const packageFile = packagePath ? archive.file(packagePath) : null;
  if (!packagePath || !packageFile) throw epubError("EPUB_INVALID_CONTAINER");
  const packageDocument = new DOMParser().parseFromString(await packageFile.async("string"), "application/xml");
  const all = Array.from(packageDocument.getElementsByTagName("*"));
  const textOf = (name) => all.find((node) => node.localName === name)?.textContent?.trim() || "";
  const manifest = new Map();
  for (const node of all.filter((entry) => entry.localName === "item")) manifest.set(node.getAttribute("id"), { href: node.getAttribute("href"), mediaType: node.getAttribute("media-type"), properties: node.getAttribute("properties") || "" });
  const baseDirectory = path.posix.dirname(packagePath);
  const chapters = [];
  let totalText = 0;
  for (const itemref of all.filter((entry) => entry.localName === "itemref").slice(0, 300)) {
    const item = manifest.get(itemref.getAttribute("idref"));
    if (!item?.href) continue;
    const chapterPath = path.posix.normalize(path.posix.join(baseDirectory, decodeURIComponent(item.href.split("#")[0])));
    if (chapterPath.startsWith("../")) continue;
    const chapterFile = archive.file(chapterPath);
    if (!chapterFile) continue;
    const source = await chapterFile.async("string");
    const withBreaks = source.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\1\s*>/gi, "").replace(/<\s*\/(p|div|h[1-6]|li|blockquote)\s*>/gi, "\n$&").replace(/<\s*br\b([^>]*)>/gi, "<br$1/>\n");
    const document = new DOMParser().parseFromString(withBreaks, "text/html");
    const body = Array.from(document.getElementsByTagName("*")).find((node) => node.localName === "body");
    const text = (body?.textContent || document.documentElement?.textContent || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) continue;
    totalText += text.length;
    if (totalText > 10_000_000) break;
    const heading = Array.from(document.getElementsByTagName("*")).find((node) => ["title", "h1", "h2"].includes(node.localName))?.textContent?.trim();
    chapters.push({ title: heading || `第 ${chapters.length + 1} 章`, text });
  }
  const coverItem = Array.from(manifest.values()).find((item) => item.properties.includes("cover-image"));
  let cover = null;
  if (coverItem?.href) {
    const coverFile = archive.file(path.posix.normalize(path.posix.join(baseDirectory, coverItem.href)));
    if (coverFile && (coverFile._data?.uncompressedSize ?? 0) < 5 * 1024 * 1024) cover = { data: await coverFile.async("base64"), mimeType: coverItem.mediaType || "image/jpeg" };
  }
  if (chapters.length === 0) throw epubError("EPUB_NO_CHAPTERS");
  return { title: textOf("title") || path.basename(filePath, path.extname(filePath)), creator: textOf("creator"), language: textOf("language"), cover, chapters };
}

module.exports = { readEpub };


