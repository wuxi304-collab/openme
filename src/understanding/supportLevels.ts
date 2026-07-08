import type { FileCategory } from "../types";
import type { Translator } from "../i18n";
import type { SupportLevel } from "./types";

export function getSupportLevel(category: FileCategory): SupportLevel {
  switch (category) {
    case "code":
    case "json":
    case "csv":
    case "image":
      return "full-built-in";
    case "pdf":
      return "high-fidelity";
    case "markdown":
    case "svg":
    case "office":
    case "epub":
      return "safe-approximate";
    case "dwg":
    case "design":
    case "package":
    case "disk":
      return "semantic-inspection";
    case "cad":
      return "experimental";
    case "audio":
    case "video":
      return "experimental";
    case "archive":
    case "font":
      return "full-built-in";
    case "other":
    default:
      return "external-open";
  }
}

export function getSupportLevelLabel(level: SupportLevel, t: Translator): string {
  switch (level) {
    case "full-built-in":
      return t("supportFullBuiltIn");
    case "high-fidelity":
      return t("supportHighFidelity");
    case "safe-approximate":
      return t("supportSafeApproximate");
    case "semantic-inspection":
      return t("supportSemanticInspection");
    case "external-open":
      return t("supportExternalOpen");
    case "experimental":
      return t("supportExperimental");
  }
}
