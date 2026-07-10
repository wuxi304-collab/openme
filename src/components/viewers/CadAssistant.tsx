import { FormEvent, useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { describeIpcError, isIpcFailure } from "../../core/ipcError";
import { CogIcon } from "../icons/CogIcon";
import ViewerError from "../ViewerError";
import "../ViewerError.css";

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

const RISK_LABEL_KEYS: Record<CadPlan["risk_level"], string> = {
  destructive: "cadAssistantRiskDestructive",
  reversible: "cadAssistantRiskReversible",
  read_only: "cadAssistantRiskReadOnly",
};

export default function CadAssistant({ filePath, fileName }: Props) {
  const { t } = useI18n();
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
      if (!result.success) {
        setError(isIpcFailure(result) ? describeIpcError(t, result) : result.message ?? t("cadAssistantSaveSettingsFailed"));
        return;
      }
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
        if (!result.success || !result.plan) {
          throw new Error(isIpcFailure(result) ? describeIpcError(t, result) : result.message ?? t("cadAssistantPlanEmpty"));
        }
        setPlan(result.plan as CadPlan);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : t("cadAssistantPlanFailed"));
      } finally { setLoading(false); }
    };

  return (
    <aside className="cad-assistant" aria-label={t("cadAssistantAria")}>
      <div className="cad-assistant-head">
        <div><span className="cad-ai-kicker">{t("cadAssistantKicker")}</span><h2>{t("cadAssistantTitle")}</h2></div>
        <button type="button" className="cad-icon-button" aria-label={t("cadAssistantSettingsAria")} onClick={() => setSettingsOpen((value) => !value)}><CogIcon size={14} strokeWidth={1.5} /></button>
      </div>

      {settingsOpen && <div className="cad-ai-settings">
        <label>{t("cadAssistantApiKey")}<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={configured ? t("cadAssistantApiKeyPlaceholderConfigured") : t("cadAssistantApiKeyPlaceholder")} autoComplete="off" /></label>
        <label>{t("cadAssistantModel")}<input value={model} onChange={(event) => setModel(event.target.value)} /></label>
        <label>{t("cadAssistantBaseUrl")}<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} /></label>
        <button type="button" onClick={saveSettings}>{t("cadAssistantSaveSettings")}</button>
      </div>}

      <div className="cad-ai-context"><span>{t("cadAssistantContextLabel")}</span><strong title={filePath}>{fileName}</strong><small>{t("cadAssistantContextHint")}</small></div>

      <form className="cad-ai-form" onSubmit={submit} role="group" aria-label={t("cadAssistantFormAria")} aria-busy={loading}>
        <label htmlFor="cad-request">{t("cadAssistantPromptLabel")}</label>
        <textarea id="cad-request" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={t("cadAssistantPromptPlaceholder")} />
        <button type="submit" disabled={!configured || loading || !prompt.trim()} aria-label={loading ? t("cadAssistantSubmittingAria") : t("cadAssistantSubmit")}>{loading ? t("cadAssistantSubmitting") : t("cadAssistantSubmit")}</button>
      </form>

      {!configured && <p className="cad-ai-notice">{t("cadAssistantApiKeyNotice")}</p>}
      {error && (
        <ViewerError
          variant="inline"
          title={t("cadAssistantErrorTitle")}
          message={error}
          onClose={() => setError(null)}
          closeLabel={t("viewerErrorClose")}
        />
      )}
      {plan && <section className="cad-plan" role="region" aria-label={t("cadAssistantPlanAria")} aria-live="polite">
        <div className="cad-plan-title"><strong>{plan.summary}</strong><span data-risk={plan.risk_level}>{t(RISK_LABEL_KEYS[plan.risk_level])}</span></div>
        {plan.needs_clarification && <p className="cad-plan-question">{plan.clarification_question}</p>}
        <ol>{plan.operations.map((operation) => <li key={operation.id}><code>{operation.action}</code><span>{operation.reason}</span></li>)}</ol>
        <button type="button" className="cad-apply-button" disabled aria-disabled="true" title={t("cadAssistantApplyHint")}>{t("cadAssistantApply")}</button>
      </section>}
    </aside>
  );
}
