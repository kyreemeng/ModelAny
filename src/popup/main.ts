import { getErrorMessage } from "../shared/errors";
import { applyStaticTranslations, bindLanguageSwitch, getLocale, t, type Locale } from "../shared/i18n";
import { getModelDisplayName, MODELS, MODEL_IDS } from "../shared/models";
import { storage } from "../shared/storage";
import type { AppState, HistoryItem, ModelId, SendTask } from "../shared/types";
import { countCodePoints, limitCodePoints, normalizePrompt } from "../shared/validation";
import {
  clearActionAttention, createPopupState, deriveSendLabel, formatHistoryTime,
  progressFromTask, restoreHistoryItem, selectionRecord,
  startSendError, summarizeTask
} from "./view";

const required = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing popup element: ${selector}`);
  return element;
};
const prompt = required<HTMLTextAreaElement>("#prompt");
const count = required<HTMLOutputElement>("#count");
const modelsRoot = required<HTMLDivElement>("#models");
const send = required<HTMLButtonElement>("#send");
const autoSubmit = required<HTMLInputElement>("#auto-submit");
const toast = required<HTMLDivElement>("#toast");
const historyDrawer = required<HTMLElement>("#history");
const historyList = required<HTMLOListElement>("#history-list");
let appState: AppState;
let state = createPopupState();
let saveTimer: number | undefined;
let locale: Locale = getLocale();

const showToast = (message: string, alert = false) => {
  toast.textContent = message;
  toast.hidden = false;
  toast.setAttribute("role", alert ? "alert" : "status");
  window.setTimeout(() => { toast.hidden = true; }, 3000);
};
const renderButton = () => {
  const derived = deriveSendLabel(state, locale);
  send.disabled = derived.disabled;
  send.textContent = derived.label;
};
const renderModels = () => {
  modelsRoot.replaceChildren();
  for (const model of MODELS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "model-card";
    button.dataset.modelId = model.id;
    button.setAttribute("aria-pressed", String(state.selected.includes(model.id)));
    const displayName = getModelDisplayName(model, locale);
    button.setAttribute("aria-label", `${displayName}: ${state.selected.includes(model.id) ? (locale === "zh-CN" ? "已选择" : "Selected") : (locale === "zh-CN" ? "未选择" : "Not selected")}`);
    const mark = document.createElement("img");
    mark.className = `model-mark model-mark--${model.id}`;
    mark.src = chrome.runtime.getURL(model.iconPath);
    mark.alt = "";
    mark.setAttribute("aria-hidden", "true");
    const label = document.createElement("strong");
    label.textContent = displayName;
    button.append(mark, label);
    button.addEventListener("click", () => {
      state.selected = state.selected.includes(model.id) ? state.selected.filter((id) => id !== model.id) : [...state.selected, model.id];
      appState.modelEnabled[model.id] = state.selected.includes(model.id);
      void storage.saveModelSelection(appState.modelEnabled);
      renderModels();
      renderButton();
    });
    modelsRoot.append(button);
  }
};
const applySelection = (selected: readonly ModelId[]) => {
  state.selected = [...selected];
  appState.modelEnabled = selectionRecord(selected);
  void storage.saveModelSelection(appState.modelEnabled);
  renderModels();
  renderButton();
};
const renderHistory = () => {
  historyList.replaceChildren();
  for (const item of appState.history) {
    const row = document.createElement("li");
    row.className = "history-item";
    const restore = document.createElement("button");
    restore.type = "button";
    const text = document.createElement("p");
    text.textContent = limitCodePoints(item.text, 160);
    const time = document.createElement("time");
    time.dateTime = new Date(item.createdAt).toISOString();
    time.textContent = formatHistoryTime(item.createdAt, locale);
    restore.append(text, time);
    restore.addEventListener("click", () => {
      const restored = restoreHistoryItem(item);
      prompt.value = restored.draftText;
      state.draftText = restored.draftText;
      autoSubmit.checked = restored.autoSubmit;
      appState.settings.autoSubmit = restored.autoSubmit;
      applySelection(restored.selected);
      void storage.saveSettings({ autoSubmit: restored.autoSubmit });
      updatePrompt();
      historyDrawer.hidden = true;
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = t("delete", {}, locale);
    remove.setAttribute("aria-label", t("deleteHistoryLabel", { time: time.textContent }, locale));
    remove.addEventListener("click", async () => {
      await storage.deleteHistory(item.id);
      appState.history = appState.history.filter(({ id }) => id !== item.id);
      renderHistory();
    });
    row.append(restore, remove);
    historyList.append(row);
  }
  required("#history-count").textContent = String(appState.history.length);
};
const updatePrompt = () => {
  const limited = limitCodePoints(prompt.value);
  if (limited !== prompt.value) { prompt.value = limited; showToast(t("truncated", {}, locale), true); }
  state.draftText = prompt.value;
  count.textContent = `${countCodePoints(prompt.value)} / 5000`;
  renderButton();
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => { void storage.saveDraft(prompt.value); }, 500);
};
const performSend = async () => {
  const normalized = normalizePrompt(prompt.value);
  if (!normalized || state.selected.length === 0) return;
  const item: HistoryItem = {
    id: crypto.randomUUID(), text: normalized, createdAt: Date.now(),
    modelIds: [...state.selected], autoSubmit: autoSubmit.checked
  };
  await storage.addHistory(item);
  appState.history = [item, ...appState.history].slice(0, 20);
  renderHistory();
  state = { ...state, sending: true, completed: 0, total: state.selected.length };
  renderButton();
  try {
    const response: unknown = await chrome.runtime.sendMessage({
      type: "START_SEND", prompt: normalized, modelIds: [...state.selected],
      autoSubmit: autoSubmit.checked, groupTabs: appState.settings.groupTabs,
      recordLogs: appState.settings.localMetrics
    });
    const responseError = startSendError(response);
    if (responseError) {
      state.sending = false;
      showToast(responseError, true);
      renderButton();
    }
  } catch (error) {
    state.sending = false;
    showToast(error instanceof Error ? error.message : t("sendFailed", {}, locale), true);
    renderButton();
  }
};
document.addEventListener("DOMContentLoaded", async () => {
  void clearActionAttention({
    setBadge: (text) => chrome.action.setBadgeText({ text }),
    setTitle: (title) => chrome.action.setTitle({ title })
  }).catch(() => undefined);
  appState = await storage.getAppState();
  locale = getLocale(appState.settings.locale);
  applyStaticTranslations(locale);
  bindLanguageSwitch(document, locale, async (next) => {
    await storage.saveSettings({ locale: next });
    location.reload();
  });
  prompt.value = appState.draftText;
  autoSubmit.checked = appState.settings.autoSubmit;
  state = createPopupState({ draftText: prompt.value, selected: MODEL_IDS.filter((id) => appState.modelEnabled[id]) });
  updatePrompt();
  renderModels();
  renderHistory();
  const active = appState.tasks.find(({ status }) => status !== "completed");
  if (active) { state = { ...state, ...progressFromTask(active) }; renderButton(); }
});
prompt.addEventListener("input", updatePrompt);
prompt.addEventListener("paste", (event) => {
  event.preventDefault();
  const pasted = event.clipboardData?.getData("text/plain") ?? "";
  prompt.setRangeText(limitCodePoints(pasted, 5000 - countCodePoints(prompt.value)), prompt.selectionStart, prompt.selectionEnd, "end");
  updatePrompt();
});
autoSubmit.addEventListener("change", () => { appState.settings.autoSubmit = autoSubmit.checked; void storage.saveSettings({ autoSubmit: autoSubmit.checked }); });
send.addEventListener("click", () => { void performSend(); });
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !send.disabled) void performSend();
});
required("#select-all").addEventListener("click", () => { applySelection(MODEL_IDS); });
required("#clear-all").addEventListener("click", () => { applySelection([]); });
required("#history-toggle").addEventListener("click", () => { historyDrawer.hidden = false; renderHistory(); });
required("#history-close").addEventListener("click", () => { historyDrawer.hidden = true; });
required("#clear-history").addEventListener("click", async () => { await storage.clearHistory(); appState.history = []; renderHistory(); });
required("#open-options").addEventListener("click", () => { void chrome.runtime.openOptionsPage(); });
chrome.runtime.onMessage.addListener((message: { type?: string; task?: SendTask }) => {
  if (message.type !== "TASK_PROGRESS" || !message.task) return;
  const task = message.task;
  state.completed = task.modelIds.filter((id) => task.results[id]?.status !== "PENDING" && task.results[id]).length;
  state.total = task.modelIds.length;
  state.sending = task.status !== "completed";
  renderButton();
  if (task.status === "completed") {
    const statuses = task.modelIds.map((id) => task.results[id]?.status ?? "UNEXPECTED_ERROR");
    const summary = summarizeTask(statuses);
    const failures = task.modelIds.filter((id) => !["SUBMITTED", "FILLED"].includes(task.results[id]?.status ?? ""));
    showToast(
      summary === "success"
        ? t("sendComplete", {}, locale)
        : failures.map((id) => {
            const model = MODELS.find((m) => m.id === id);
            const name = model ? getModelDisplayName(model, locale) : id;
            return `${name}: ${getErrorMessage(task.results[id]?.status ?? "UNEXPECTED_ERROR", locale)}`;
          }).join(locale === "zh-CN" ? "；" : "; "),
      summary !== "success"
    );
  }
});
window.addEventListener("pagehide", () => { window.clearTimeout(saveTimer); void storage.saveDraft(prompt.value); });
