import { useEffect, useState } from "react";

interface Props { filePath: string; kind: "audio" | "video"; }

export default function MediaViewer({ filePath, kind }: Props) {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let disposed = false; window.electronAPI.getMediaUrl(filePath).then((url) => { if (!disposed) setSource(url); }).catch((reason) => { if (!disposed) setError(reason instanceof Error ? reason.message : "媒体无法打开"); }); return () => { disposed = true; }; }, [filePath]);
  if (error) return <div className="viewer-error" role="alert"><strong>媒体无法播放</strong><p>{error}</p></div>;
  return (
    <div className={`media-viewer is-${kind}`}>
      <div className="viewer-header"><span className="viewer-label">{kind === "video" ? "视频" : "音频"}</span><span className="viewer-meta">本地播放</span></div>
      <div className="media-stage">
        {!source ? <div className="viewer-busy" role="status"><span className="dwg-loader" />正在载入…</div> : kind === "video" ? <video src={source} controls preload="metadata" playsInline onError={() => setError("当前编码不受 Chromium 支持，可改用系统播放器")}>浏览器不支持视频播放。</video> : <div className="audio-deck"><div className="audio-disc" aria-hidden="true"><i /></div><div className="audio-bars" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} />)}</div><audio src={source} controls preload="metadata" onError={() => setError("当前编码不受 Chromium 支持，可改用系统播放器")}>浏览器不支持音频播放。</audio></div>}
      </div>
    </div>
  );
}
