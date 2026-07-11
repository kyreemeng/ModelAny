import { MODELS } from "../shared/models";
import { createDiagnosticExport } from "../shared/export";
import { storage } from "../shared/storage";
import type { AppState, Settings } from "../shared/types";

const required = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing options element: ${selector}`);
  return element;
};
const status = required<HTMLElement>("#status");
const dialog = required<HTMLDialogElement>("#danger-dialog");
let state: AppState;
let dangerAction: (() => Promise<void>) | undefined;
const settingControls: Partial<Record<keyof Settings, HTMLInputElement>> = {
  autoSubmit: required("#setting-auto"),
  groupTabs: required("#setting-group"),
  localMetrics: required("#setting-metrics")
};
const notify = (text: string) => {
  status.textContent = text;
  window.setTimeout(() => { status.textContent = ""; }, 2500);
};
const renderModels = () => {
  const root = required("#model-settings");
  root.replaceChildren();
  for (const model of MODELS) {
    const label = document.createElement("label");
    label.className = "switch-row";
    const text = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = model.name;
    const small = document.createElement("small");
    small.textContent = model.hostname;
    text.append(strong, small);
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.modelEnabled[model.id];
    input.addEventListener("change", () => {
      state.modelEnabled[model.id] = input.checked;
      void storage.saveModelSelection(state.modelEnabled).then(() => notify("模型编队已保存"));
    });
    label.append(text, input);
    root.append(label);
  }
};
const confirmDanger = (message: string, action: () => Promise<void>) => {
  required("#danger-message").textContent = message;
  dangerAction = action;
  dialog.showModal();
};
document.addEventListener("DOMContentLoaded", async () => {
  state = await storage.getAppState();
  for (const [key, input] of Object.entries(settingControls) as [keyof Settings, HTMLInputElement][]) {
    input.checked = state.settings[key];
    input.addEventListener("change", () => {
      state.settings[key] = input.checked;
      void storage.saveSettings({ [key]: input.checked }).then(() => notify("设置已保存"));
    });
  }
  renderModels();
});
required("#clear-history").addEventListener("click", () => confirmDanger("清空全部历史记录？此操作无法撤销。", async () => {
  await storage.clearHistory(); notify("历史记录已清空");
}));
required("#reset-all").addEventListener("click", () => confirmDanger("重置草稿、模型、设置、历史、日志和任务？", async () => {
  await storage.resetAllData(); notify("全部本地数据已重置"); window.setTimeout(() => location.reload(), 500);
}));
required("#danger-cancel").addEventListener("click", () => { dangerAction = undefined; dialog.close(); });
required("#danger-confirm").addEventListener("click", async () => {
  const action = dangerAction; dangerAction = undefined; dialog.close(); await action?.();
});
required("#export-logs").addEventListener("click", async () => {
  const current = await storage.getAppState();
  const payload = createDiagnosticExport({
    version: chrome.runtime.getManifest().version, exportedAt: new Date().toISOString(),
    browser: navigator.userAgent, settings: current.settings, logs: current.logs
  });
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = `modelany-diagnostics-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  notify("脱敏诊断日志已导出");
});
required("#run-diagnostics").addEventListener("click", async () => {
  const root = required("#diagnostic-results");
  root.replaceChildren();
  for (const model of MODELS) {
    const item = document.createElement("li");
    item.textContent = `${model.name}：检测中`;
    root.append(item);
  }
  const results = await chrome.runtime.sendMessage({ type: "START_DIAGNOSTICS", modelIds: MODELS.map(({ id }) => id) }) as Record<string, string>;
  Array.from(root.children).forEach((item, index) => {
    const model = MODELS[index];
    if (model) item.textContent = `${model.name}：${results[model.id] ?? "异常"}`;
  });
});
required("#close-diagnostics").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "CLOSE_DIAGNOSTIC_TABS" });
  notify("诊断标签页已关闭");
});
