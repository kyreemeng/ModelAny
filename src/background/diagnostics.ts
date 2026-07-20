import { getModelById } from "../shared/models";
import type { ModelId, ModelResultCode } from "../shared/types";
import { t, type Locale } from "../shared/i18n";

interface DiagnosticDependencies {
  createTab(url: string): Promise<number>;
  sendToTab(tabId: number, message: { type: "DIAGNOSE"; modelId: ModelId }): Promise<{ status: ModelResultCode }>;
  closeTab(tabId: number): Promise<void>;
}

export const createDiagnostics = (dependencies: DiagnosticDependencies) => {
  const tabIds: number[] = [];
  const run = async (modelIds: ModelId[], locale: Locale = "zh-CN") => {
    const labels: Partial<Record<ModelResultCode, string>> = {
      FILLED: t("diagnosticNormal", {}, locale),
      NOT_LOGGED_IN: t("modelNeedsLogin", {}, locale),
      INPUT_NOT_FOUND: t("inputNotFound", {}, locale),
      PAGE_TIMEOUT: t("pageTimeout", {}, locale)
    };
    const entries = await Promise.all(modelIds.map(async (modelId) => {
      try {
        const tabId = await dependencies.createTab(getModelById(modelId).url);
        tabIds.push(tabId);
        const result = await dependencies.sendToTab(tabId, { type: "DIAGNOSE", modelId });
        return [modelId, labels[result.status] ?? t("diagnosticError", {}, locale)] as const;
      } catch {
        return [modelId, t("diagnosticError", {}, locale)] as const;
      }
    }));
    return Object.fromEntries(entries) as Record<ModelId, string>;
  };
  const close = async () => {
    const closing = tabIds.splice(0).map((tabId) => dependencies.closeTab(tabId));
    await Promise.allSettled(closing);
  };
  return { run, close };
};
