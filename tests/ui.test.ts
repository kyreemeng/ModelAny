import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  clearActionAttention, createPopupState, deriveSendLabel, formatHistoryTime,
  progressFromTask, restoreHistoryItem, selectionRecord,
  startSendError, summarizeTask
} from "../src/popup/view";
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
      chatgpt: false,
      gemini: false
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

  it("clears context-menu badge and title when popup opens", async () => {
    const calls: string[] = [];
    await clearActionAttention({
      setBadge: async (text) => { calls.push(`badge:${text}`); },
      setTitle: async (title) => { calls.push(`title:${title}`); }
    });
    expect(calls).toEqual(["badge:", "title:ModelAny"]);
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
