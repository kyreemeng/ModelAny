import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  clearActionAttention, createPopupState, deriveSendLabel, formatHistoryTime,
  progressFromTask, restoreHistoryItem, resultPresentation, selectionRecord,
  startSendError, summarizeTask
} from "../src/popup/view";
import { createDiagnosticExport } from "../src/shared/export";
import type { HistoryItem, SendTask } from "../src/shared/types";

describe("popup state and rendering helpers", () => {
  it("restores state and derives disabled button labels", () => {
    const state = createPopupState({ draftText: "问题", selected: [], sending: false });
    expect(deriveSendLabel(state)).toEqual({ disabled: true, label: "请选择至少一个模型" });
    expect(deriveSendLabel({ ...state, selected: ["doubao", "kimi"] })).toEqual({ disabled: false, label: "发送到 2 个模型" });
    expect(deriveSendLabel({ ...state, sending: true, completed: 1, total: 2 })).toEqual({ disabled: true, label: "已完成 1/2" });
  });

  it("formats history and summarizes success states", () => {
    expect(formatHistoryTime(0, "zh-CN")).toContain("1970");
    expect(summarizeTask(["SUBMITTED", "FILLED"])).toBe("success");
    expect(summarizeTask(["SUBMITTED", "INPUT_NOT_FOUND"])).toBe("partial");
    expect(summarizeTask(["PAGE_TIMEOUT"])).toBe("failure");
  });

  it("creates a complete persisted model selection", () => {
    expect(selectionRecord(["doubao", "kimi"])).toEqual({
      doubao: true,
      qwen: false,
      deepseek: false,
      kimi: true,
      glm: false,
      wenxin: false,
      chatgpt: false
    });
  });

  it("excludes PENDING results when restoring active progress", () => {
    const task: SendTask = {
      id: "t", prompt: "p", promptSummary: "p", modelIds: ["doubao", "qwen"],
      autoSubmit: true, groupTabs: false, recordLogs: true, startedAt: 1, deadline: 2,
      status: "running", results: {
        doubao: { modelId: "doubao", status: "PENDING", startedAt: 1 },
        qwen: { modelId: "qwen", status: "FILLED", startedAt: 1 }
      }
    };
    expect(progressFromTask(task)).toEqual({ completed: 1, total: 2, sending: true });
  });

  it("recognizes START_SEND error responses", () => {
    expect(startSendError({ error: "INVALID_REQUEST" })).toBe("INVALID_REQUEST");
    expect(startSendError({ id: "task" })).toBeUndefined();
  });

  it("restores prompt, model formation, and auto-submit from history", () => {
    const item: HistoryItem = {
      id: "h", text: "历史问题", createdAt: 1, modelIds: ["kimi", "glm"], autoSubmit: false
    };
    expect(restoreHistoryItem(item)).toEqual({
      draftText: "历史问题", selected: ["kimi", "glm"], autoSubmit: false
    });
  });

  it("builds per-model failures and selects the first successful result tab", () => {
    const task: SendTask = {
      id: "t", prompt: "p", promptSummary: "p", modelIds: ["doubao", "qwen", "glm"],
      autoSubmit: true, groupTabs: false, recordLogs: true, startedAt: 1, deadline: 2,
      status: "completed", results: {
        doubao: { modelId: "doubao", status: "NOT_LOGGED_IN", tabId: 3, startedAt: 1 },
        qwen: { modelId: "qwen", status: "SUBMITTED", tabId: 4, startedAt: 1 },
        glm: { modelId: "glm", status: "INPUT_NOT_FOUND", tabId: 5, startedAt: 1 }
      }
    };
    expect(resultPresentation(task)).toEqual({
      firstSuccessTabId: 4,
      failures: [
        expect.objectContaining({ modelId: "doubao", canOpenLogin: true, tabId: 3 }),
        expect.objectContaining({ modelId: "glm", canOpenLogin: false, tabId: 5 })
      ]
    });
  });

  it("clears context-menu badge and title when popup opens", async () => {
    const calls: string[] = [];
    await clearActionAttention({
      setBadge: async (text) => { calls.push(`badge:${text}`); },
      setTitle: async (title) => { calls.push(`title:${title}`); }
    });
    expect(calls).toEqual(["badge:", "title:ModelAny"]);
  });
});

describe("diagnostic export", () => {
  it("excludes drafts and history text", () => {
    const exported = createDiagnosticExport({
      version: "1.0.0", exportedAt: "2026-01-01", browser: "Chrome",
      settings: { autoSubmit: true, groupTabs: true, confirmManyTabs: true, localMetrics: true },
      logs: [{ id: "l", taskId: "t", modelId: "glm", startedAt: 1, durationMs: 2, result: "SUBMITTED" }]
    });
    expect(JSON.stringify(exported)).not.toContain("draft");
    expect(Object.keys(exported)).toEqual(["version", "exportedAt", "browser", "settings", "logs"]);
  });
});

describe("accessible static UI", () => {
  it("provides semantic controls, dialogs, and reduced motion", async () => {
    const popup = await readFile("src/popup/index.html", "utf8");
    const options = await readFile("src/options/index.html", "utf8");
    const css = `${await readFile("src/shared/theme.css", "utf8")}${await readFile("src/popup/style.css", "utf8")}`;
    expect(popup).toContain("<label");
    expect(popup).toContain('aria-live="polite"');
    expect(options).toContain("<dialog");
    expect(popup).toContain('id="result-details"');
    expect(options).toContain("<main");
    expect(options.match(/<section/g)?.length).toBeGreaterThanOrEqual(5);
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("overflow-x: hidden");
    expect(css).toContain("linear-gradient(180deg, #f5fbff");
    expect(css).not.toMatch(/\.console-shell\s*\{[^}]*border-radius/);
    expect(popup).not.toMatch(/on(click|input|change)=/);
    expect(popup).not.toContain("confirm-dialog");
    expect(options).not.toContain("setting-confirm");
  });
});
