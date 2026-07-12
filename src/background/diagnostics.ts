import { getModelById } from "../shared/models";
import type { ModelId, ModelResultCode } from "../shared/types";

interface DiagnosticDependencies {
  createTab(url: string): Promise<number>;
  sendToTab(tabId: number, message: { type: "DIAGNOSE"; modelId: ModelId }): Promise<{ status: ModelResultCode }>;
  closeTab(tabId: number): Promise<void>;
}

const labels: Partial<Record<ModelResultCode, string>> = {
  FILLED: "正常",
  NOT_LOGGED_IN: "需要登录",
  INPUT_NOT_FOUND: "未找到输入框",
  PAGE_TIMEOUT: "页面超时"
};

export const createDiagnostics = (dependencies: DiagnosticDependencies) => {
  const tabIds: number[] = [];
  const run = async (modelIds: ModelId[]) => {
    const entries = await Promise.all(modelIds.map(async (modelId) => {
      try {
        const tabId = await dependencies.createTab(getModelById(modelId).url);
        tabIds.push(tabId);
        const result = await dependencies.sendToTab(tabId, { type: "DIAGNOSE", modelId });
        return [modelId, labels[result.status] ?? "异常"] as const;
      } catch {
        return [modelId, "异常"] as const;
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
