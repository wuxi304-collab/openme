import { useEffect, useState } from "react";

interface Props { filePath: string; kind: "audio" | "video"; }

export default function MediaViewer({ filePath, kind }: Props) {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    setError(null);
    setSource(null);

    window.electronAPI
      .getMediaUrl(filePath)
      .then((url) => {
        if (!disposed) setSource(url);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : "媒体无法打开");
      });

    return () => {
      disposed = true;
    };
  }, [filePath]);

  if (error) {
    return <MediaFallback filePath={filePath} kind={kind} message={error} />;
  }

  const codecHint = kind === "video"
    ? "本地视频播放 · 解码能力取决于 Electron / Chromium / 系统编码器"
    : "本地音频播放 · 解码能力取决于 Electron / Chromium / 系统编码器";

  return (
    <div className={`media-viewer is-${kind}`}>
      <div className="viewer-header">
        <span className="viewer-label">{kind === "video" ? "视频" : "音频"}</span>
        <span className="viewer-meta">{codecHint}</span>
      </div>
      <div className="media-stage">
        {!source ? (
          <div className="viewer-busy" role="status"><span className="dwg-loader" />正在载入…</div>
        ) : kind === "video" ? (
          <video
            src={source}
            controls
            preload="metadata"
            playsInline
            onError={() => setError("容器已识别，但当前编码可能不受内置播放器支持。")}
          >
            浏览器不支持视频播放。
          </video>
        ) : (
          <div className="audio-deck">
            <div className="audio-disc" aria-hidden="true"><i /></div>
            <div className="audio-bars" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} />)}</div>
            <audio
              src={source}
              controls
              preload="metadata"
              onError={() => setError("容器已识别，但当前编码可能不受内置播放器支持。")}
            >
              浏览器不支持音频播放。
            </audio>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaFallback({ filePath, kind, message }: { filePath: string; kind: "audio" | "video"; message: string }) {
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
  return (
    <div
      className="viewer-error"
      role="alert"
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          borderRadius: 20,
          padding: "28px 32px",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(148,163,184,0.28)",
          boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "rgba(37,99,235,0.10)",
              color: "#2563EB",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            {kind === "video" ? "影" : "声"}
          </div>
          <div>
            <strong style={{ display: "block", fontSize: 16, color: "#0F172A" }}>{kind === "video" ? "视频无法内置播放" : "音频无法内置播放"}</strong>
            <span style={{ display: "block", fontSize: 12, color: "#64748B", marginTop: 2 }}>{fileName}</span>
          </div>
        </div>

        <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.7, color: "#334155" }}>{message}</p>
        <p style={{ margin: "0 0 18px", fontSize: 12, lineHeight: 1.7, color: "#64748B" }}>
          OpenMe 已识别该媒体文件，但容器格式不等于编码器可解码。MOV、MKV、AVI、WMV、HEVC、ProRes 等文件是否能播放，取决于 Electron、Chromium 与系统环境。
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn-mario" onClick={() => window.electronAPI.openInSystem(filePath)}>
            用系统程序打开
          </button>
          <span style={{ alignSelf: "center", fontSize: 12, color: "#94A3B8" }}>源文件未被修改，未上传。</span>
        </div>
      </div>
    </div>
  );
}
