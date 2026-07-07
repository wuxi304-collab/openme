import { builtInPacks } from "./builtin";
import type { DomainPackManifest, PackRegistryEntry, PackSuggestion, SupportedFileCategory } from "./types";

export function listDomainPacks(options?: { includePlanned?: boolean }): PackRegistryEntry[] {
  const includePlanned = options?.includePlanned ?? true;
  return builtInPacks.filter((entry) => includePlanned || entry.manifest.status !== "planned");
}

export function listEnabledDomainPacks(): PackRegistryEntry[] {
  return builtInPacks.filter((entry) => entry.enabledByDefault);
}

export function getDomainPack(packId: string): DomainPackManifest | null {
  return builtInPacks.find((entry) => entry.manifest.id === packId)?.manifest ?? null;
}

export function suggestDomainPacks(input: {
  fileName: string;
  category: SupportedFileCategory;
  text?: string;
}): PackSuggestion[] {
  const haystack = `${input.fileName} ${input.text ?? ""}`.toLowerCase();

  return builtInPacks
    .map((entry) => {
      const { manifest } = entry;
      let score = 0;
      const reasons: string[] = [];

      if (manifest.supportedCategories.includes(input.category)) {
        score += 0.35;
        reasons.push(`supports ${input.category}`);
      }

      const matchedKeywords = manifest.keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
      if (matchedKeywords.length > 0) {
        score += Math.min(0.55, matchedKeywords.length * 0.12);
        reasons.push(`matched ${matchedKeywords.slice(0, 3).join(", ")}`);
      }

      if (entry.enabledByDefault) score += 0.05;
      if (manifest.status === "stable") score += 0.05;
      if (manifest.status === "planned") score -= 0.15;

      return {
        packId: manifest.id,
        confidence: Math.max(0, Math.min(1, Number(score.toFixed(2)))),
        reason: reasons.join("; ") || "no strong signal",
      } satisfies PackSuggestion;
    })
    .filter((suggestion) => suggestion.confidence >= 0.25)
    .sort((a, b) => b.confidence - a.confidence);
}
