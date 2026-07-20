import { getModelById } from "../shared/models";
import type { LogEntry, ModelId, ModelResultCode, ModelTaskResult, SendTask } from "../shared/types";
import { limitCodePoints } from "../shared/validation";

interface Repository {
  saveTask(task: SendTask): Promise<void>;
  appendLogs(entries: LogEntry[]): Promise<void>;
  getPendingTasks(): Promise<SendTask[]>;
}
interface RunnerDependencies {
  repository: Repository;
  createTab(url: string, deadline: number): Promise<number>;
  sendToTab(tabId: number, message: { type: "FILL_PROMPT"; modelId: ModelId; prompt: string; autoSubmit: boolean }, deadline: number): Promise<{ status: ModelResultCode; detail?: string }>;
  groupTabs(tabIds: number[]): Promise<number>;
  setGroupTitle(groupId: number, title: string): Promise<void>;
  broadcast(task: SendTask): Promise<void>;
  now(): number;
  randomId(): string;
  timeoutMs: number;
  classifyError?(error: unknown, tabId: number | undefined, modelId: ModelId): Promise<ModelResultCode>;
}

export const groupTitle = (prompt: string): string =>
  `ModelAny- ${limitCodePoints(prompt.replace(/\s+/g, " ").trim(), 15)}`;

export const createTaskRunner = (dependencies: RunnerDependencies) => {
  let resumePromise: Promise<SendTask[]> | undefined;
  const activeTasks = new Map<string, Promise<SendTask>>();
  const persist = async (task: SendTask) => {
    await dependencies.repository.saveTask(task);
    await dependencies.broadcast(task);
  };

  const runOne = async (task: SendTask, modelId: ModelId): Promise<void> => {
    const existing = task.results[modelId];
    let tabId = existing?.tabId;
    const startedAt = existing?.startedAt ?? dependencies.now();
    try {
      if (!tabId) tabId = await dependencies.createTab(getModelById(modelId).url, task.deadline);
      task.results[modelId] = { modelId, status: "PENDING", tabId, startedAt };
      await persist(task);
      const remaining = task.deadline - dependencies.now();
      if (remaining <= 0) throw Object.assign(new Error("PAGE_TIMEOUT"), { code: "PAGE_TIMEOUT" });
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const response = await Promise.race([
        dependencies.sendToTab(tabId, { type: "FILL_PROMPT", modelId, prompt: task.prompt, autoSubmit: task.autoSubmit }, task.deadline),
        new Promise<{ status: ModelResultCode }>((resolve) => {
          timeout = setTimeout(() => resolve({ status: "PAGE_TIMEOUT" }), remaining);
        })
      ]).finally(() => { if (timeout) clearTimeout(timeout); });
      task.results[modelId] = {
        modelId, status: response.status, tabId, startedAt, finishedAt: dependencies.now(),
        errorMessage: "detail" in response ? response.detail : undefined
      };
    } catch (error) {
      const status = dependencies.classifyError
        ? await dependencies.classifyError(error, tabId, modelId)
        : "UNEXPECTED_ERROR";
      task.results[modelId] = {
        modelId, status, tabId, startedAt, finishedAt: dependencies.now(),
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
    await persist(task);
  };

  const finalize = async (task: SendTask) => {
    if (task.status === "completed") return task;
    const tabIds = task.modelIds.flatMap((id) => task.results[id]?.tabId ?? []);
    if (task.groupTabs && tabIds.length > 1) {
      try {
        const groupId = await dependencies.groupTabs(tabIds);
        await dependencies.setGroupTitle(groupId, groupTitle(task.prompt));
      } catch {
        // Grouping is an organizational enhancement; delivery results remain valid.
      }
    }
    task.status = "completed";
    await persist(task);
    if (task.recordLogs === false) return task;
    const logs: LogEntry[] = task.modelIds.map((modelId) => {
      const result = task.results[modelId] as ModelTaskResult;
      return {
        id: `${task.id}-${modelId}`, taskId: task.id, modelId, startedAt: result.startedAt,
        durationMs: Math.max(0, (result.finishedAt ?? dependencies.now()) - result.startedAt),
        result: result.status,
        errorCode: result.status.endsWith("ERROR") || result.status.includes("NOT_") ? result.status : undefined,
        errorMessage: result.errorMessage
      };
    });
    await dependencies.repository.appendLogs(logs);
    return task;
  };

  const runTask = async (task: SendTask) => {
    if (task.status === "completed") return task;
    if (dependencies.now() >= task.deadline) {
      for (const modelId of task.modelIds) {
        const existing = task.results[modelId];
        if (!existing || existing.status === "PENDING") {
          task.results[modelId] = {
            modelId, status: "PAGE_TIMEOUT", tabId: existing?.tabId,
            startedAt: existing?.startedAt ?? task.startedAt, finishedAt: dependencies.now()
          };
        }
      }
      return finalize(task);
    }
    task.status = "running";
    await persist(task);
    const pending = task.modelIds.filter((id) => !task.results[id] || task.results[id]?.status === "PENDING");
    await Promise.all(pending.map((id) => runOne(task, id)));
    return finalize(task);
  };
  const execute = (task: SendTask): Promise<SendTask> => {
    const active = activeTasks.get(task.id);
    if (active) return active;
    const operation = runTask(task).finally(() => { activeTasks.delete(task.id); });
    activeTasks.set(task.id, operation);
    return operation;
  };

  const createTask = (input: Pick<SendTask, "prompt" | "modelIds" | "autoSubmit" | "groupTabs" | "recordLogs">): SendTask => {
    const startedAt = dependencies.now();
    return {
      ...input, id: dependencies.randomId(), promptSummary: groupTitle(input.prompt),
      startedAt, deadline: startedAt + dependencies.timeoutMs, status: "pending", results: {}
    };
  };
  const start = async (input: Pick<SendTask, "prompt" | "modelIds" | "autoSubmit" | "groupTabs" | "recordLogs">) => {
    const task = createTask(input);
    await persist(task);
    return execute(task);
  };
  const enqueue = async (input: Pick<SendTask, "prompt" | "modelIds" | "autoSubmit" | "groupTabs" | "recordLogs">) => {
    const task = createTask(input);
    await persist(task);
    void execute(task);
    return { taskId: task.id };
  };

  const resume = (): Promise<SendTask[]> => {
    if (resumePromise) return resumePromise;
    const operation = dependencies.repository.getPendingTasks()
      .then((tasks) => Promise.all(tasks.map(execute)))
      .finally(() => { resumePromise = undefined; });
    resumePromise = operation;
    return operation;
  };
  return { start, enqueue, resume };
};
