import { MODEL_IDS } from "../shared/models";
import type { HistoryItem, ModelId, ModelResultCode, ModelSelection, SendTask } from "../shared/types";
import { t, type Locale } from "../shared/i18n";

export interface PopupState {
  draftText: string;
  selected: ModelId[];
  sending: boolean;
  completed: number;
  total: number;
}

export const createPopupState = (initial: Partial<PopupState> = {}): PopupState => ({
  draftText: "", selected: [], sending: false, completed: 0, total: 0, ...initial
});

export const selectionRecord = (selected: readonly ModelId[]): ModelSelection =>
  Object.fromEntries(MODEL_IDS.map((id) => [id, selected.includes(id)])) as ModelSelection;

export const progressFromTask = (task: SendTask): Pick<PopupState, "completed" | "total" | "sending"> => ({
  completed: task.modelIds.filter((id) => {
    const status = task.results[id]?.status;
    return status !== undefined && status !== "PENDING";
  }).length,
  total: task.modelIds.length,
  sending: task.status !== "completed"
});

export const startSendError = (response: unknown): string | undefined => {
  if (!response || typeof response !== "object" || !("error" in response)) return undefined;
  return typeof response.error === "string" ? response.error : "发送任务创建失败";
};

export const restoreHistoryItem = (item: HistoryItem): {
  draftText: string; selected: ModelId[]; autoSubmit: boolean;
} => ({ draftText: item.text, selected: [...item.modelIds], autoSubmit: item.autoSubmit });

export const deriveSendLabel = (state: PopupState, locale: Locale = "zh-CN"): { disabled: boolean; label: string } => {
  if (state.sending) return { disabled: true, label: t("completed", { completed: state.completed, total: state.total }, locale) };
  if (!state.draftText.trim()) return { disabled: true, label: t("sendEmpty", {}, locale) };
  if (state.selected.length === 0) return { disabled: true, label: t("selectModel", {}, locale) };
  return { disabled: false, label: t("sendToModels", { count: state.selected.length }, locale) };
};

export const formatHistoryTime = (timestamp: number, locale = navigator.language): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);

const successCodes: ModelResultCode[] = ["SUBMITTED", "FILLED"];
export const summarizeTask = (statuses: ModelResultCode[]): "success" | "partial" | "failure" => {
  const successes = statuses.filter((status) => successCodes.includes(status)).length;
  if (successes === statuses.length && statuses.length > 0) return "success";
  if (successes > 0) return "partial";
  return "failure";
};

export const clearActionAttention = async (dependencies: {
  setBadge(text: string): Promise<void>;
  setTitle(title: string): Promise<void>;
}): Promise<void> => {
  await dependencies.setBadge("");
  await dependencies.setTitle("ModelAny");
};
