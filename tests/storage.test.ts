import { beforeEach, describe, expect, it } from "vitest";
import { createStorageRepository, DEFAULT_STATE } from "../src/shared/storage";
import type { AppState, HistoryItem, LogEntry, SendTask } from "../src/shared/types";

const memoryStorage = () => {
  let data: Partial<AppState> = {};
  return {
    area: {
      get: async () => ({ ...data }),
      set: async (next: Partial<AppState>) => { data = { ...data, ...next }; },
      clear: async () => { data = {}; }
    },
    snapshot: () => data
  };
};

describe("storage repository", () => {
  let memory: ReturnType<typeof memoryStorage>;
  beforeEach(() => { memory = memoryStorage(); });

  it("returns defaults and deeply merges settings", async () => {
    const repo = createStorageRepository(memory.area);
    expect(await repo.getAppState()).toEqual(DEFAULT_STATE);
    await repo.saveSettings({ autoSubmit: false });
    expect((await repo.getAppState()).settings).toEqual({ ...DEFAULT_STATE.settings, autoSubmit: false });
  });

  it("keeps 20 newest history entries and 50 newest logs", async () => {
    const repo = createStorageRepository(memory.area);
    for (let index = 0; index < 22; index += 1) {
      await repo.addHistory({ id: `${index}`, text: `${index}`, createdAt: index, modelIds: ["doubao"], autoSubmit: true });
    }
    const logs: LogEntry[] = Array.from({ length: 52 }, (_, index) => ({
      id: `${index}`, taskId: "task", modelId: "doubao", startedAt: index,
      durationMs: 1, result: "SUBMITTED"
    }));
    await repo.appendLogs(logs);
    expect((await repo.getAppState()).history).toHaveLength(20);
    expect((await repo.getAppState()).history[0]?.id).toBe("21");
    expect((await repo.getAppState()).logs).toHaveLength(50);
  });

  it("recovers only unfinished tasks and resets all data", async () => {
    const repo = createStorageRepository(memory.area);
    const task = (status: SendTask["status"]): SendTask => ({
      id: status, prompt: "问", promptSummary: "问", modelIds: ["doubao"], autoSubmit: true,
      groupTabs: true, recordLogs: true, startedAt: 1, deadline: 2, status, results: {}
    });
    await repo.saveTask(task("running"));
    await repo.saveTask(task("completed"));
    expect((await repo.getPendingTasks()).map(({ id }) => id)).toEqual(["running"]);
    await repo.resetAllData();
    expect(await repo.getAppState()).toEqual(DEFAULT_STATE);
  });

  it("deletes individual history entries", async () => {
    const repo = createStorageRepository(memory.area);
    const item: HistoryItem = { id: "one", text: "text", createdAt: 1, modelIds: ["glm"], autoSubmit: false };
    await repo.addHistory(item);
    await repo.deleteHistory("one");
    expect((await repo.getAppState()).history).toEqual([]);
  });
});
