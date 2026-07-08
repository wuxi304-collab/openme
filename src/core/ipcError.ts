import type { Translator } from "../i18n";

// Shape returned by every main-process IPC handler that uses ipcError().
export interface IpcFailure {
  success: false;
  code: string;
  params?: Record<string, string | number>;
  message: string;
}

// Resolve a main-process IPC error result to a localized string.
// Falls back to the bundled Chinese message if the translator doesn't know
// the code yet (e.g. a brand-new error or a renderer without i18n keys).
export function describeIpcError(t: Translator, result: IpcFailure | null | undefined): string {
  if (!result) return t("ipcUnknownError");
  if (result.code && result.code !== "ipcUnknownError") {
    const localized = t(result.code, result.params);
    // If the translator doesn't know this code, the i18n module returns the
    // key itself (e.g. "ZIP_TOO_MANY_FILES"). Fall back to the bundled
    // Chinese fallback in that case.
    if (localized !== result.code) return localized;
  }
  return result.message || t("ipcUnknownError");
}

export function isIpcFailure(value: unknown): value is IpcFailure {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { success?: unknown }).success === false &&
      typeof (value as { code?: unknown }).code === "string"
  );
}