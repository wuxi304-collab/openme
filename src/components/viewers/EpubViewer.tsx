import { useEffect, useMemo, useState } from "react";

type Chapter = { title: string; text: string };
type Book = { title: string; creator?: string; language?: string; cover?: { data: string; mimeType: string } | null; chapters: Chapter[] };
interface Props { filePath: string; }

export default function EpubViewer({ filePath }: Props) {
  const progressKey = useMemo(() => `openme:epub:${filePath}`, [filePath]);
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState(() => Number(sessionStorage.getItem(progressKey)) || 0);
  const [fontSize, setFontSize] = useState(17);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let disposed = false; window.electronAPI.readEpub(filePath).then((result) => { if (disposed) return; if (result.success && result.book) { setBook(result.book); setChapter((value) => Math.min(value, result.book!.chapters.length - 1)); } else setError(result.message ?? "EPUB 无法读取"); }).catch((reason) => { if (!disposed) setError(reason instanceof Error ? reason.message : "EPUB 无法读取"); }); return () => { disposed = true; }; }, [filePath]);
  useEffect(() => { sessionStorage.setItem(progressKey, String(chapter)); }, [chapter, progressKey]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (!book || event.target instanceof HTMLInputElement) return; if (event.key === "ArrowLeft") setChapter((value) => Math.max(0, value - 1)); if (event.key === "ArrowRight") setChapter((value) => Math.min(book.chapters.length - 1, value + 1)); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [book]);
  const paragraphs = useMemo(() => book?.chapters[chapter]?.text.split(/\n+/).filter(Boolean) ?? [], [book, chapter]);
  if (error) return <div className="viewer-error" role="alert"><strong>EPUB 无法预览</strong><p>{error}</p><button type="button" onClick={() => window.electronAPI.openInSystem(filePath)}>系统打开</button></div>;
  if (!book) return <div className="viewer-busy" role="status"><span className="dwg-loader" />正在整理章节…</div>;
  const needle = query.trim().toLocaleLowerCase();
  return (
    <div className="epub-viewer">
      <aside className="epub-sidebar">{book.cover && <img src={`data:${book.cover.mimeType};base64,${book.cover.data}`} alt="书籍封面" />}<h2>{book.title}</h2>{book.creator && <p>{book.creator}</p>}<nav aria-label="章节目录">{book.chapters.map((item, index) => <button type="button" key={`${item.title}-${index}`} className={index === chapter ? "is-active" : ""} aria-current={index === chapter ? "page" : undefined} onClick={() => setChapter(index)}><span>{index + 1}</span>{item.title}</button>)}</nav></aside>
      <main className="epub-reader"><div className="epub-progress" aria-label={`阅读进度 ${Math.round(((chapter + 1) / book.chapters.length) * 100)}%`}><i style={{ transform: `scaleX(${(chapter + 1) / book.chapters.length})` }} /></div><div className="epub-toolbar"><span>{chapter + 1} / {book.chapters.length}</span><label><span className="sr-only">搜索本章</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索本章…" /></label><div className="viewer-tools"><button type="button" aria-label="减小字号" onClick={() => setFontSize((value) => Math.max(13, value - 1))}>字−</button><button type="button" aria-label="增大字号" onClick={() => setFontSize((value) => Math.min(28, value + 1))}>字＋</button></div></div><article style={{ fontSize }}><h1>{book.chapters[chapter].title}</h1>{paragraphs.map((paragraph, index) => !needle || paragraph.toLocaleLowerCase().includes(needle) ? <p key={index}>{paragraph}</p> : null)}</article><footer><button type="button" disabled={chapter === 0} onClick={() => setChapter((value) => value - 1)}>上一章</button><button type="button" disabled={chapter === book.chapters.length - 1} onClick={() => setChapter((value) => value + 1)}>下一章</button></footer></main>
    </div>
  );
}


