import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { describeIpcError, isIpcFailure } from "../../core/ipcError";

type Chapter = { title: string | null; index?: number; text: string };
type Book = { title: string; creator?: string; language?: string; cover?: { data: string; mimeType: string } | null; chapters: Chapter[] };
interface Props { filePath: string; }

export default function EpubViewer({ filePath }: Props) {
  const { t, tf } = useI18n();
  const progressKey = useMemo(() => `openme:epub:${filePath}`, [filePath]);
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState(() => Number(sessionStorage.getItem(progressKey)) || 0);
  const [fontSize, setFontSize] = useState(17);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    window.electronAPI.readEpub(filePath).then((result) => {
      if (disposed) return;
      if (result.success && result.book) {
        setBook(result.book);
        setChapter((value) => Math.min(value, result.book!.chapters.length - 1));
      } else if (isIpcFailure(result)) setError(describeIpcError(t, result));
      else setError(result.message ?? t("epubLoadFailed"));
    }).catch((reason) => {
      if (!disposed) setError(reason instanceof Error ? reason.message : t("epubLoadFailed"));
    });
    return () => { disposed = true; };
  }, [filePath, t]);
  useEffect(() => { sessionStorage.setItem(progressKey, String(chapter)); }, [chapter, progressKey]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!book || event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") setChapter((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setChapter((value) => Math.min(book.chapters.length - 1, value + 1));
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [book]);
  const paragraphs = useMemo(() => book?.chapters[chapter]?.text.split(/\n+/).filter(Boolean) ?? [], [book, chapter]);
  if (error) {
    return (
      <div className="viewer-error" role="alert">
        <strong>{t("epubErrorTitle")}</strong>
        <p>{error}</p>
        <button type="button" onClick={() => window.electronAPI.openInSystem(filePath)}>{t("epubOpenInSystem")}</button>
      </div>
    );
  }
  if (!book) return <div className="viewer-busy" role="status"><span className="dwg-loader" />{t("epubLoading")}</div>;
  const needle = query.trim().toLocaleLowerCase();
  const progressPct = Math.round(((chapter + 1) / book.chapters.length) * 100);
    // Renderer-side localization for chapter titles. Main process only ships the
    // raw heading (or null) plus a stable 1-based index; we substitute the
    // locale-appropriate fallback here so a mid-session language switch does not
    // require re-reading the file.
    const chapterLabel = (item: Chapter, index: number) =>
      item.title || tf("epubChapterFallback", { index: item.index ?? index + 1 });
  return (
    <div className="epub-viewer">
      <aside className="epub-sidebar">
        {book.cover && <img src={`data:${book.cover.mimeType};base64,${book.cover.data}`} alt={t("epubCoverAlt")} />}
        <h2>{book.title}</h2>
        {book.creator && <p>{book.creator}</p>}
        <nav aria-label={t("epubTocAria")}>
          {book.chapters.map((item, index) => (
            <button type="button" key={`${item.title ?? ""}-${index}`} className={index === chapter ? "is-active" : ""} aria-current={index === chapter ? "page" : undefined} onClick={() => setChapter(index)}>
                          <span>{index + 1}</span>{chapterLabel(item, index)}
            </button>
          ))}
        </nav>
      </aside>
      <main className="epub-reader">
        <div className="epub-progress" aria-label={tf("epubProgressAria", { n: progressPct })}>
          <i style={{ transform: `scaleX(${(chapter + 1) / book.chapters.length})` }} />
        </div>
        <div className="epub-toolbar">
          <span>{tf("epubChapterCounter", { current: chapter + 1, total: book.chapters.length })}</span>
          <label>
            <span className="sr-only">{t("epubSearchAria")}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("epubSearchPlaceholder")} />
          </label>
          <div className="viewer-tools">
            <button type="button" aria-label={t("epubDecFontAria")} onClick={() => setFontSize((value) => Math.max(13, value - 1))}>{t("epubDecFont")}</button>
            <button type="button" aria-label={t("epubIncFontAria")} onClick={() => setFontSize((value) => Math.min(28, value + 1))}>{t("epubIncFont")}</button>
          </div>
        </div>
        <article style={{ fontSize }}>
          <h1>{chapterLabel(book.chapters[chapter], chapter)}</h1>
          {paragraphs.map((paragraph, index) => !needle || paragraph.toLocaleLowerCase().includes(needle) ? <p key={index}>{paragraph}</p> : null)}
        </article>
        <footer>
          <button type="button" disabled={chapter === 0} onClick={() => setChapter((value) => value - 1)}>{t("epubPrev")}</button>
          <button type="button" disabled={chapter === book.chapters.length - 1} onClick={() => setChapter((value) => value + 1)}>{t("epubNext")}</button>
        </footer>
      </main>
    </div>
  );
}


