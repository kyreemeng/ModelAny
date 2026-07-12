import { MODEL_IDS } from "./models";
import type { AppState, HistoryItem, LogEntry, ModelSelection, SendTask, Settings } from "./types";

interface StorageAreaLike {
  get(keys?: unknown): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  clear(): Promise<void>;
}

const defaultSelection = Object.fromEntries(MODEL_IDS.map((id) => [id, true])) as ModelSelection;
export const DEFAULT_STATE: AppState = {
  draftText: "",
  modelEnabled: defaultSelection,
  settings: { autoSubmit: true, groupTabs: false, confirmManyTabs: true, localMetrics: true },
  history: [],
  logs: [],
  tasks: []
};

const cloneDefaults = (): AppState => structuredClone(DEFAULT_STATE);

export const createStorageRepository = (area: StorageAreaLike = chrome.storage.local) => {
  const getAppState = async (): Promise<AppState> => {
    const raw = await area.get();
    const defaults = cloneDefaults();
    return {
      ...defaults,
      ...raw,
      settings: { ...defaults.settings, ...(raw.settings as Partial<Settings> | undefined) },
      modelEnabled: { ...defaults.modelEnabled, ...(raw.modelEnabled as Partial<ModelSelection> | undefined) },
      history: Array.isArray(raw.history) ? raw.history as HistoryItem[] : [],
      logs: Array.isArray(raw.logs) ? raw.logs as LogEntry[] : [],
      tasks: Array.isArray(raw.tasks) ? raw.tasks as SendTask[] : []
    };
  };

  const saveDraft = async (draftText: string) => area.set({ draftText });
  const saveModelSelection = async (modelEnabled: ModelSelection) => area.set({ modelEnabled });
  const saveSettings = async (patch: Partial<Settings>) => {
    const state = await getAppState();
    await area.set({ settings: { ...state.settings, ...patch } });
  };
  const addHistory = async (item: HistoryItem) => {
    const state = await getAppState();
    await area.set({ history: [item, ...state.history].slice(0, 20) });
  };
  const deleteHistory = async (id: string) => {
    const state = await getAppState();
    await area.set({ history: state.history.filter((item) => item.id !== id) });
  };
  const clearHistory = async () => area.set({ history: [] });
  const appendLogs = async (entries: LogEntry[]) => {
    const state = await getAppState();
    await area.set({ logs: [...entries, ...state.logs].sort((a, b) => b.startedAt - a.startedAt).slice(0, 50) });
  };
  const saveTask = async (task: SendTask) => {
    const state = await getAppState();
    await area.set({ tasks: [task, ...state.tasks.filter(({ id }) => id !== task.id)].slice(0, 25) });
  };
  const getPendingTasks = async () => (await getAppState()).tasks.filter(({ status }) => status !== "completed");
  const resetAllData = async () => { await area.clear(); };

  return {
    getAppState, saveDraft, saveModelSelection, saveSettings, addHistory, deleteHistory,
    clearHistory, appendLogs, saveTask, getPendingTasks, resetAllData
  };
};

export const storage = createStorageRepository();
