import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import ViewerError from "../ViewerError";
import "../ViewerError.css";

interface Props { base64Data: string; fileName: string; }

export default function FontViewer({ base64Data, fileName }: Props) {
  const { t, tf } = useI18n();
  const samples = useMemo(
    () => [tf("fontSample1"), tf("fontSample2"), tf("fontSample3"), tf("fontSample4")],
    [tf]
  );
  const [sample, setSample] = useState(samples[0]);
  const [size, setSize] = useState(54);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const family = useMemo(() => `OpenMePreview-${Math.random().toString(36).slice(2)}`, [base64Data]);
  useEffect(() => {
    const binary = atob(base64Data); const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes]));
    const face = new FontFace(family, `url(${url})`);
    face.load().then((loaded) => { document.fonts.add(loaded); setStatus("ready"); }).catch(() => setStatus("error"));
    return () => { document.fonts.delete(face); URL.revokeObjectURL(url); };
  }, [base64Data, family]);
  useEffect(() => { setSample(samples[0]); }, [samples]);
  return (
    <div className="font-viewer">
      <div className="viewer-header"><span className="viewer-label">{t("fontLabel")} <small className="viewer-meta">{fileName}</small></span><div className="viewer-tools"><label className="font-size-field">{t("fontSizeLabel")} <input type="range" min="18" max="120" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label><span className="viewer-zoom">{size}px</span></div></div>
      {status === "error" ? <ViewerError title={t("fontErrorTitle")} message={t("fontErrorBody")} /> : <div className="font-sheet"><label><span className="sr-only">{t("fontSizeAria")}</span><input value={sample} onChange={(event) => setSample(event.target.value)} placeholder={t("fontSizePlaceholder")} /></label><div className="font-hero" style={{ fontFamily: family, fontSize: size }}>{status === "ready" ? sample || t("fontEmptyState") : t("fontLoading")}</div><div className="font-specimens">{samples.slice(1).map((text, index) => <p key={text} style={{ fontFamily: family, fontSize: 20 + index * 7 }}>{text}</p>)}</div></div>}
    </div>
  );
}
