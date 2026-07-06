import { useEffect, useMemo, useState } from "react";

interface Props { base64Data: string; fileName: string; }
const SAMPLES = ["OpenMe 字体预览", "天地玄黄 宇宙洪荒", "Aa Bb Cc 0123456789", "不锈钢工程图纸 GB/T 24511"];

export default function FontViewer({ base64Data, fileName }: Props) {
  const [sample, setSample] = useState(SAMPLES[0]);
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
  return (
    <div className="font-viewer">
      <div className="viewer-header"><span className="viewer-label">字体 <small className="viewer-meta">{fileName}</small></span><div className="viewer-tools"><label className="font-size-field">字号 <input type="range" min="18" max="120" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label><span className="viewer-zoom">{size}px</span></div></div>
      {status === "error" ? <div className="viewer-error" role="alert"><strong>字体无法加载</strong><p>文件可能损坏或使用了不支持的字体容器。</p></div> : <div className="font-sheet"><label><span className="sr-only">预览文字</span><input value={sample} onChange={(event) => setSample(event.target.value)} placeholder="输入预览文字…" /></label><div className="font-hero" style={{ fontFamily: family, fontSize: size }}>{status === "ready" ? sample || "输入文字开始预览" : "正在加载字体…"}</div><div className="font-specimens">{SAMPLES.slice(1).map((text, index) => <p key={text} style={{ fontFamily: family, fontSize: 20 + index * 7 }}>{text}</p>)}</div></div>}
    </div>
  );
}
