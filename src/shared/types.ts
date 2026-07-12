export type ModelId = "doubao" | "qwen" | "deepseek" | "kimi" | "glm" | "wenxin" | "chatgpt" | "gemini";

export interface Settings {
  autoSubmit: boolean;
  groupTabs: boolean;
  confirmManyTabs: boolean;
  localMetrics: boolean;
}

export type ModelSelection = Record<ModelId, boolean>;
export type ModelResultCode =
  | "PENDING" | "FILLED" | "SUBMITTED" | "NOT_LOGGED_IN"
  | "INPUT_NOT_FOUND" | "SUBMIT_NOT_FOUND" | "TAB_CLOSED"
  | "PAGE_TIMEOUT" | "UNEXPECTED_ERROR";

export interface ModelTaskResult {
  modelId: ModelId;
  status: ModelResultCode;
  tabId?: number;
  startedAt: number;
  finishedAt?: number;
  errorMessage?: string;
}

export interface SendTask {
  id: string;
  prompt: string;
  promptSummary: string;
  modelIds: ModelId[];
  autoSubmit: boolean;
  groupTabs: boolean;
  recordLogs: boolean;
  startedAt: number;
  deadline: number;
  status: "pending" | "running" | "completed";
  results: Partial<Record<ModelId, ModelTaskResult>>;
}

export interface HistoryItem {
  id: string;
  text: string;
  createdAt: number;
  modelIds: ModelId[];
  autoSubmit: boolean;
}

export interface LogEntry {
  id: string;
  taskId: string;
  modelId: ModelId;
  startedAt: number;
  durationMs: number;
  result: ModelResultCode;
  errorCode?: string;
  errorMessage?: string;
}

export interface AppState {
  draftText: string;
  modelEnabled: ModelSelection;
  settings: Settings;
  history: HistoryItem[];
  logs: LogEntry[];
  tasks: SendTask[];
}

export type ExtensionMessage =
  | { type: "START_SEND"; prompt: string; modelIds: ModelId[]; autoSubmit: boolean; groupTabs: boolean; recordLogs: boolean }
  | { type: "WEB_LAUNCH"; nonce: string; request: { prompt: string; modelIds: ModelId[]; autoSubmit: boolean } }
  | { type: "FILL_PROMPT"; modelId: ModelId; prompt: string; autoSubmit: boolean }
  | { type: "DIAGNOSE"; modelId: ModelId }
  | { type: "TASK_PROGRESS"; task: SendTask }
  | { type: "START_DIAGNOSTICS"; modelIds: ModelId[] }
  | { type: "CLOSE_DIAGNOSTIC_TABS" };
