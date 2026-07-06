import { FormEvent, useEffect, useState } from "react";

interface CadPlanOperation {
  id: string;
  action: string;
  target: string | null;
  layer: string | null;
  x: number | null;
  y: number | null;
  x2: number | null;
  y2: number | null;
  radius: number | null;
  angle: number | null;
  scale: number | null;
  text: string | null;
  reason: string;
}

interface CadPlan {
  summary: string;
  risk_level: "read_only" | "reversible" | "destructive";
  requires_confirmation: boolean;
  needs_clarification: boolean;
  clarification_question: string | null;
  operations: CadPlanOperation[];
}

interface Props { filePath: string; fileName: string; }

export default function CadAssistant({ filePath, fileName }: Props) {
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<CadPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-5.4-mini");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");

  useEffect(() => {
    window.electronAPI.getAiConfig().then((config) => {
      setConfigured(config.configured);
      setModel(config.model);
      setBaseUrl(config.baseUrl);
      setSettingsOpen(!config.configured);
    }).catch(() => setSettingsOpen(true));
  }, []);

  const saveSettings = async () => {
    setError(null);
    const result = await window.electronAPI.saveAiConfig({ apiKey, model, baseUrl });
    if (!result.success) { setError(result.message ?? "无法保存模型设置"); return; }
    setConfigured(true);
    setApiKey("");
    setSettingsOpen(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true); setError(null); setPlan(null);
    try {
      const result = await window.electronAPI.planCadChange({ filePath, fileName, request: prompt.trim() });
      if (!result.success || !result.plan) throw new Error(result.message ?? "模型没有返回可执行计划");
      setPlan(result.plan as CadPlan);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "规划失败");
    } finally { setLoading(false); }
  };

  return (
    <aside className="cad-assistant" aria-label="CAD AI 助手">
      <div className="cad-assistant-head">
        <div><span className="cad-ai-kicker">CAD COPILOT</span><h2>图纸助手</h2></div>
        <button type="button" className="cad-icon-button" aria-label="模型设置" onClick={() => setSettingsOpen((value) => !value)}>⚙</button>
      </div>

      {settingsOpen && <div className="cad-ai-settings">
        <label>API Key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={configured ? "已安全保存，留空不修改" : "sk-…"} autoComplete="off" /></label>
        <label>模型<input value={model} onChange={(event) => setModel(event.target.value)} /></label>
        <label>接口地址<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} /></label>
        <button type="button" onClick={saveSettings}>保存设置</button>
      </div>}

      <div className="cad-ai-context"><span>当前图纸</span><strong title={filePath}>{fileName}</strong><small>修改前会生成操作计划，不会直接覆盖原文件</small></div>

      <form className="cad-ai-form" onSubmit={submit}>
        <label htmlFor="cad-request">你想怎么改？</label>
        <textarea id="cad-request" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="例如：把所有尺寸标注移到 DIM 图层，并将文字高度统一为 2.5" />
        <button type="submit" disabled={!configured || loading || !prompt.trim()}>{loading ? "正在分析…" : "生成修改计划"}</button>
      </form>

      {!configured && <p className="cad-ai-notice">先填写 API Key。密钥只保存在 Electron 主进程的加密存储中。</p>}
      {error && <p className="cad-ai-error" role="alert">{error}</p>}
      {plan && <section className="cad-plan" aria-live="polite">
        <div className="cad-plan-title"><strong>{plan.summary}</strong><span data-risk={plan.risk_level}>{plan.risk_level === "destructive" ? "高风险" : plan.risk_level === "reversible" ? "可撤销" : "只读"}</span></div>
        {plan.needs_clarification && <p className="cad-plan-question">{plan.clarification_question}</p>}
        <ol>{plan.operations.map((operation) => <li key={operation.id}><code>{operation.action}</code><span>{operation.reason}</span></li>)}</ol>
        <button type="button" className="cad-apply-button" disabled title="安装 CAD 引擎后启用">应用修改（引擎待接入）</button>
      </section>}
    </aside>
  );
}
