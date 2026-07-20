import { getModelDisplayName, MODELS } from "../shared/models";
import { storage } from "../shared/storage";
import type { AppState } from "../shared/types";
import { applyStaticTranslations, bindLanguageSwitch, getLocale, t, type Locale } from "../shared/i18n";

const required = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing options element: ${selector}`);
  return element;
};
const status = required<HTMLElement>("#status");
const dialog = required<HTMLDialogElement>("#danger-dialog");
let state: AppState;
let dangerAction: (() => Promise<void>) | undefined;
let locale: Locale = getLocale();
type ToggleSetting = "autoSubmit" | "groupTabs" | "localMetrics";
const settingControls: Record<ToggleSetting, HTMLInputElement> = {
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
    strong.textContent = getModelDisplayName(model, locale);
    const small = document.createElement("small");
    small.textContent = model.hostname;
    text.append(strong, small);
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.modelEnabled[model.id];
    input.addEventListener("change", () => {
      state.modelEnabled[model.id] = input.checked;
      void storage.saveModelSelection(state.modelEnabled).then(() => notify(t("formationSaved", {}, locale)));
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
  locale = getLocale(state.settings.locale);
  applyStaticTranslations(locale);
  document.title = t("settingsTitle", {}, locale);
  const version = chrome.runtime.getManifest().version;
  const aboutVersion = required<HTMLElement>("#about-version");
  aboutVersion.textContent = `ModelAny v${version} · Manifest V3`;
  bindLanguageSwitch(document, locale, async (next) => {
    await storage.saveSettings({ locale: next });
    location.reload();
  });
  for (const [key, input] of Object.entries(settingControls) as [ToggleSetting, HTMLInputElement][]) {
    input.checked = state.settings[key];
    input.addEventListener("change", () => {
      state.settings[key] = input.checked;
      void storage.saveSettings({ [key]: input.checked }).then(() => notify(t("settingsSaved", {}, locale)));
    });
  }
  renderModels();
});
required("#clear-history").addEventListener("click", () => confirmDanger(t("clearHistoryConfirm", {}, locale), async () => {
  await storage.clearHistory(); notify(t("clearHistoryDone", {}, locale));
}));
required("#reset-all").addEventListener("click", () => confirmDanger(t("resetAllConfirm", {}, locale), async () => {
  await storage.resetAllData(); notify(t("resetAllDone", {}, locale)); window.setTimeout(() => location.reload(), 500);
}));
required("#danger-cancel").addEventListener("click", () => { dangerAction = undefined; dialog.close(); });
required("#danger-confirm").addEventListener("click", async () => {
  const action = dangerAction; dangerAction = undefined; dialog.close(); await action?.();
});
required("#run-diagnostics").addEventListener("click", async () => {
  const root = required("#diagnostic-results");
  root.replaceChildren();
  for (const model of MODELS) {
    const item = document.createElement("li");
    item.textContent = `${getModelDisplayName(model, locale)}: ${t("checking", {}, locale)}`;
    root.append(item);
  }
  const results = await chrome.runtime.sendMessage({ type: "START_DIAGNOSTICS", modelIds: MODELS.map(({ id }) => id), locale }) as Record<string, string>;
  Array.from(root.children).forEach((item, index) => {
    const model = MODELS[index];
    if (model) item.textContent = `${getModelDisplayName(model, locale)}: ${results[model.id] ?? t("diagnosticError", {}, locale)}`;
  });
});
required("#close-diagnostics").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "CLOSE_DIAGNOSTIC_TABS" });
  notify(t("diagnosticTabsClosed", {}, locale));
});
