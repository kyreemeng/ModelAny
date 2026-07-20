import { describe, expect, it, vi } from "vitest";
import { createDiagnostics } from "../src/background/diagnostics";
import { createTaskRunner, groupTitle } from "../src/background/task-runner";
import { handleContextSelection } from "../src/background/service-worker";
import type { SendTask } from "../src/shared/types";

const repository = () => ({
  saveTask: vi.fn(async () => undefined),
  appendLogs: vi.fn(async () => undefined),
  getPendingTasks: vi.fn(async (): Promise<SendTask[]> => [])
});

describe("recoverable task runner", () => {
  it("acknowledges an enqueued website task before model delivery completes", async () => {
    const repo = repository();
    let finishDelivery!: () => void;
    const delivery = new Promise<{ status: "SUBMITTED" }>((resolve) => {
      finishDelivery = () => resolve({ status: "SUBMITTED" });
    });
    const runner = createTaskRunner({
      repository: repo,
      createTab: async () => 1,
      sendToTab: async () => delivery,
      groupTabs: vi.fn(),
      setGroupTitle: vi.fn(),
      broadcast: vi.fn(async () => undefined),
      now: () => 100,
      randomId: () => "website-task",
      timeoutMs: 15_000
    });

    const acknowledgment = await runner.enqueue({
      prompt: "从官网发送",
      modelIds: ["chatgpt"],
      autoSubmit: false,
      groupTabs: true,
      recordLogs: false
    });

    expect(acknowledgment).toEqual({ taskId: "website-task" });
    expect(repo.saveTask).toHaveBeenCalled();
    finishDelivery();
  });

  it("creates tabs in model order, persists progress, and groups successful tabs", async () => {
    const repo = repository();
    const created: string[] = [];
    const group = vi.fn(async () => 9);
    const runner = createTaskRunner({
      repository: repo,
      createTab: async (url) => { created.push(url); return created.length; },
      sendToTab: async (_tabId, message) => ({ status: message.modelId === "qwen" ? "INPUT_NOT_FOUND" : "SUBMITTED" }),
      groupTabs: group,
      setGroupTitle: vi.fn(async () => undefined),
      broadcast: vi.fn(async () => undefined),
      now: () => 100,
      randomId: () => "task-1",
      timeoutMs: 15_000
    });
    const task = await runner.start({ prompt: "这是一个很长的问题标题🙂继续", modelIds: ["doubao", "qwen", "glm"], autoSubmit: true, groupTabs: true, recordLogs: true });
    expect(created).toEqual([
      "https://www.doubao.com/chat/",
      "https://www.qianwen.com/",
      "https://chatglm.cn/"
    ]);
    expect(task.status).toBe("completed");
    expect(task.results.qwen?.status).toBe("INPUT_NOT_FOUND");
    expect(group).toHaveBeenCalledWith([1, 2, 3]);
    expect(repo.saveTask.mock.calls.length).toBeGreaterThan(3);
    expect(repo.appendLogs).toHaveBeenCalledOnce();
  });

  it("opens Wenxin's new chat and ChatGPT when they are selected", async () => {
    const repo = repository();
    const created: string[] = [];
    const runner = createTaskRunner({
      repository: repo,
      createTab: async (url) => { created.push(url); return created.length; },
      sendToTab: async () => ({ status: "SUBMITTED" as const }),
      groupTabs: vi.fn(async () => 1),
      setGroupTitle: vi.fn(async () => undefined),
      broadcast: vi.fn(async () => undefined),
      now: () => 100,
      randomId: () => "new-providers",
      timeoutMs: 15_000
    });

    await runner.start({
      prompt: "测试新模型", modelIds: ["wenxin", "chatgpt"],
      autoSubmit: true, groupTabs: false, recordLogs: true
    });

    expect(created).toEqual([
      "https://wenxin.baidu.com/new-chat?from=search_brand",
      "https://chatgpt.com/"
    ]);
  });

  it("does not redeliver a pending model when task recovery overlaps its initial send", async () => {
    let persisted: SendTask | undefined;
    const repo = {
      saveTask: vi.fn(async (task: SendTask) => { persisted = task; }),
      appendLogs: vi.fn(async () => undefined),
      getPendingTasks: vi.fn(async (): Promise<SendTask[]> => [])
    };
    let releaseSend!: () => void;
    let signalFirstDelivery!: () => void;
    const firstDeliveryStarted = new Promise<void>((resolve) => { signalFirstDelivery = resolve; });
    let deliveries = 0;
    const sendToTab = vi.fn(() => {
      deliveries += 1;
      if (deliveries === 1) {
        signalFirstDelivery();
        return new Promise<{ status: "SUBMITTED" }>((resolveDelivery) => {
          releaseSend = () => resolveDelivery({ status: "SUBMITTED" });
        });
      }
      return Promise.resolve({ status: "SUBMITTED" as const });
    });
    const runner = createTaskRunner({
      repository: repo,
      createTab: async () => 7,
      sendToTab,
      groupTabs: vi.fn(),
      setGroupTitle: vi.fn(),
      broadcast: vi.fn(),
      now: () => 100,
      randomId: () => "overlap",
      timeoutMs: 15_000
    });
    const start = runner.start({
      prompt: "测试", modelIds: ["kimi"], autoSubmit: false, groupTabs: false, recordLogs: true
    });
    await firstDeliveryStarted;
    repo.getPendingTasks.mockResolvedValue([persisted!]);
    const recovery = runner.resume();
    await Promise.resolve();
    expect(sendToTab).toHaveBeenCalledOnce();
    releaseSend();
    await Promise.all([start, recovery]);
  });

  it("resumes persisted unfinished tasks without relying on popup state", async () => {
    const repo = repository();
    repo.getPendingTasks.mockResolvedValue([{
      id: "old", prompt: "恢复", promptSummary: "恢复", modelIds: ["doubao"], autoSubmit: false,
      groupTabs: false, recordLogs: true, startedAt: 1, deadline: 99_999, status: "running",
      results: { doubao: { modelId: "doubao", status: "PENDING", tabId: 7, startedAt: 1 } }
    }]);
    const sendToTab = vi.fn(async () => ({ status: "FILLED" as const }));
    const runner = createTaskRunner({
      repository: repo, createTab: vi.fn(), sendToTab, groupTabs: vi.fn(),
      setGroupTitle: vi.fn(), broadcast: vi.fn(), now: () => 100, randomId: () => "new", timeoutMs: 15_000
    });
    await runner.resume();
    expect(sendToTab).toHaveBeenCalledWith(7, expect.objectContaining({ prompt: "恢复" }), 99_999);
  });

  it("truncates group titles by Unicode code point", () => {
    expect(groupTitle("12345678901234🙂尾")).toBe("ModelAny- 12345678901234🙂");
  });

  it("completes and logs even when Chrome cannot group tabs", async () => {
    const repo = repository();
    const runner = createTaskRunner({
      repository: repo,
      createTab: async () => 1,
      sendToTab: async () => ({ status: "SUBMITTED" }),
      groupTabs: async () => { throw new Error("group unavailable"); },
      setGroupTitle: vi.fn(),
      broadcast: vi.fn(async () => undefined),
      now: () => 100,
      randomId: () => "task-group-failure",
      timeoutMs: 15_000
    });

    const task = await runner.start({
      prompt: "分组失败不应阻塞",
      modelIds: ["doubao", "qwen"],
      autoSubmit: true,
      groupTabs: true,
      recordLogs: true
    });

    expect(task.status).toBe("completed");
    expect(repo.appendLogs).toHaveBeenCalledOnce();
  });

  it("classifies delivery errors as closed tabs or page timeouts", async () => {
    const repo = repository();
    const runner = createTaskRunner({
      repository: repo,
      createTab: async (_url) => 7,
      sendToTab: async () => { throw new Error("delivery failed"); },
      classifyError: async (_error, _tabId, modelId) => modelId === "doubao" ? "TAB_CLOSED" : "PAGE_TIMEOUT",
      groupTabs: vi.fn(), setGroupTitle: vi.fn(), broadcast: vi.fn(),
      now: () => 100, randomId: () => "classified", timeoutMs: 15_000
    });
    const task = await runner.start({
      prompt: "错误映射", modelIds: ["doubao", "qwen"], autoSubmit: true, groupTabs: false, recordLogs: true
    });
    expect(task.results.doubao?.status).toBe("TAB_CLOSED");
    expect(task.results.qwen?.status).toBe("PAGE_TIMEOUT");
  });

  it("expires overdue recovered tasks without sending and finalizes only once", async () => {
    const repo = repository();
    const expired: SendTask = {
      id: "expired", prompt: "过期", promptSummary: "过期", modelIds: ["doubao"], autoSubmit: false,
      groupTabs: false, recordLogs: true, startedAt: 1, deadline: 50, status: "running",
      results: { doubao: { modelId: "doubao", status: "PENDING", tabId: 8, startedAt: 1 } }
    };
    repo.getPendingTasks.mockResolvedValue([expired]);
    const sendToTab = vi.fn(async () => ({ status: "FILLED" as const }));
    const runner = createTaskRunner({
      repository: repo, createTab: vi.fn(), sendToTab, classifyError: vi.fn(),
      groupTabs: vi.fn(), setGroupTitle: vi.fn(), broadcast: vi.fn(),
      now: () => 100, randomId: () => "new", timeoutMs: 15_000
    });
    await runner.resume();
    await runner.resume();
    expect(sendToTab).not.toHaveBeenCalled();
    expect(expired.results.doubao?.status).toBe("PAGE_TIMEOUT");
    expect(repo.appendLogs).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight resume operation per runner instance", async () => {
    const repo = repository();
    let release!: () => void;
    repo.getPendingTasks.mockImplementation(() => new Promise<SendTask[]>((resolve) => {
      release = () => resolve([]);
    }));
    const runner = createTaskRunner({
      repository: repo, createTab: vi.fn(), sendToTab: vi.fn(), classifyError: vi.fn(),
      groupTabs: vi.fn(), setGroupTitle: vi.fn(), broadcast: vi.fn(),
      now: () => 100, randomId: () => "new", timeoutMs: 15_000
    });
    const first = runner.resume();
    const second = runner.resume();
    expect(repo.getPendingTasks).toHaveBeenCalledTimes(1);
    release();
    expect(second).toBe(first);
    await first;
  });

  it("does not append logs when the immutable task snapshot disables metrics", async () => {
    const repo = repository();
    const runner = createTaskRunner({
      repository: repo, createTab: async () => 1,
      sendToTab: async () => ({ status: "SUBMITTED" }), classifyError: vi.fn(),
      groupTabs: vi.fn(), setGroupTitle: vi.fn(), broadcast: vi.fn(),
      now: () => 100, randomId: () => "private", timeoutMs: 15_000
    });
    await runner.start({
      prompt: "不记录", modelIds: ["glm"], autoSubmit: true, groupTabs: false, recordLogs: false
    });
    expect(repo.appendLogs).not.toHaveBeenCalled();
  });
});

describe("context menu selection", () => {
  it("stores at most 5000 characters and falls back to badge when popup fails", async () => {
    const saveDraft = vi.fn(async (_value: string) => undefined);
    const setBadge = vi.fn(async () => undefined);
    await handleContextSelection("🙂".repeat(5001), {
      saveDraft, openPopup: async () => { throw new Error("blocked"); }, setBadge, setTitle: vi.fn()
    });
    expect(Array.from(saveDraft.mock.calls[0]![0])).toHaveLength(5000);
    expect(setBadge).toHaveBeenCalledWith("!");
  });
});

describe("diagnostics", () => {
  it("sends only DIAGNOSE messages and closes created tabs", async () => {
    const send = vi.fn(async () => ({ status: "FILLED" as const }));
    const close = vi.fn(async () => undefined);
    let nextId = 0;
    const diagnostics = createDiagnostics({
      createTab: async () => ++nextId,
      sendToTab: send,
      closeTab: close
    });
    const results = await diagnostics.run(["doubao", "glm"]);
    expect(results).toEqual({ doubao: "正常", glm: "正常" });
    expect(send).toHaveBeenCalledWith(1, { type: "DIAGNOSE", modelId: "doubao" });
    await diagnostics.close();
    expect(close).toHaveBeenCalledTimes(2);
  });
});
