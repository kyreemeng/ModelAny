import { createTaskRunner } from "./task-runner";
import { createDiagnostics } from "./diagnostics";
import { classifyDeliveryError, DeliveryError, sendMessageWithRetry } from "./tab-messaging";
import { MODEL_IDS } from "../shared/models";
import { storage } from "../shared/storage";
import type { ExtensionMessage, ModelId } from "../shared/types";
import { limitCodePoints, normalizePrompt } from "../shared/validation";
import { WEBSITE_ORIGIN } from "../web-bridge/protocol";

export interface ContextDependencies {
  saveDraft(value: string): Promise<void>;
  openPopup(): Promise<void>;
  setBadge(text: string): Promise<void>;
  setTitle(title: string): Promise<void>;
}

export const handleContextSelection = async (selection: string, dependencies: ContextDependencies): Promise<void> => {
  const prompt = normalizePrompt(limitCodePoints(selection));
  if (!prompt) return;
  await dependencies.saveDraft(prompt);
  try {
    await dependencies.openPopup();
  } catch {
    await dependencies.setBadge("!");
    await dependencies.setTitle("已保存选中文字，点击 ModelAny 继续");
  }
};

export const isWebsiteSender = (sender: chrome.runtime.MessageSender): boolean => {
  try {
    return new URL(sender.origin ?? sender.url ?? "").origin === WEBSITE_ORIGIN;
  } catch {
    return false;
  }
};

const waitUntilLoaded = async (tabId: number, deadline: number): Promise<void> => {
  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    throw new DeliveryError("TAB_CLOSED", "Tab closed before loading");
  }
  if (tab.status === "complete") return;
  await new Promise<void>((resolve, reject) => {
    const remaining = Math.max(0, deadline - Date.now());
    const cleanup = () => {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(removedListener);
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new DeliveryError("PAGE_TIMEOUT", "Page load timed out"));
    }, remaining);
    const listener = (updatedId: number, change: { status?: string }) => {
      if (updatedId !== tabId || change.status !== "complete") return;
      cleanup();
      resolve();
    };
    const removedListener = (removedId: number) => {
      if (removedId !== tabId) return;
      cleanup();
      reject(new DeliveryError("TAB_CLOSED", "Tab closed while loading"));
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.onRemoved.addListener(removedListener);
  });
};

const hasRuntime = typeof chrome !== "undefined" && Boolean(chrome.runtime?.onMessage);
if (hasRuntime) {
  const createBackgroundTab = async (url: string, deadline: number) => {
    const tab = await chrome.tabs.create({ url, active: false });
    if (tab.id === undefined) throw new Error("TAB_CREATE_FAILED");
    await waitUntilLoaded(tab.id, deadline);
    return tab.id;
  };
  const runner = createTaskRunner({
    repository: storage,
    createTab: createBackgroundTab,
    sendToTab: (tabId, message, deadline) => sendMessageWithRetry(tabId, message, {
      send: (id, body) => chrome.tabs.sendMessage(id, body),
      sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
      now: () => Date.now()
    }, deadline),
    groupTabs: (tabIds) => {
      if (tabIds.length === 0) return Promise.reject(new Error("NO_TABS_TO_GROUP"));
      return chrome.tabs.group({ tabIds: tabIds as [number, ...number[]] });
    },
    setGroupTitle: (groupId, title) => chrome.tabGroups.update(groupId, { title }).then(() => undefined),
    broadcast: async (task) => { try { await chrome.runtime.sendMessage({ type: "TASK_PROGRESS", task }); } catch { /* popup closed */ } },
    now: () => Date.now(),
    randomId: () => crypto.randomUUID(),
    timeoutMs: 15_000,
    classifyError: (error, tabId) => classifyDeliveryError(error, tabId, async (id) => {
      try { await chrome.tabs.get(id); return true; } catch { return false; }
    })
  });
  const diagnostics = createDiagnostics({
    createTab: (url) => createBackgroundTab(url, Date.now() + 15_000),
    sendToTab: (tabId, message) => chrome.tabs.sendMessage(tabId, message),
    closeTab: (tabId) => chrome.tabs.remove(tabId)
  });

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({ id: "modelany-selection", title: "使用 ModelAny 提问", contexts: ["selection"] });
    });
    void chrome.alarms.create("modelany-recover", { periodInMinutes: 1 });
  });
  chrome.runtime.onStartup.addListener(() => { void runner.resume(); });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "modelany-recover") void runner.resume();
  });
  chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== "modelany-selection" || !info.selectionText) return;
    void handleContextSelection(info.selectionText, {
      saveDraft: storage.saveDraft,
      openPopup: () => chrome.action.openPopup(),
      setBadge: (text) => chrome.action.setBadgeText({ text }),
      setTitle: (title) => chrome.action.setTitle({ title })
    });
  });
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === "START_SEND") {
      const prompt = normalizePrompt(message.prompt);
      const modelIds = message.modelIds.filter((id): id is ModelId => MODEL_IDS.includes(id));
      if (!prompt || modelIds.length === 0) { sendResponse({ error: "INVALID_REQUEST" }); return false; }
      void runner.start({
        prompt, modelIds, autoSubmit: message.autoSubmit,
        groupTabs: message.groupTabs, recordLogs: message.recordLogs
      }).then(sendResponse);
      return true;
    }
    if (message.type === "START_DIAGNOSTICS") {
      void diagnostics.run(message.modelIds.filter((id) => MODEL_IDS.includes(id))).then(sendResponse);
      return true;
    }
    if (message.type === "CLOSE_DIAGNOSTIC_TABS") {
      void diagnostics.close().then(() => sendResponse({ ok: true }));
      return true;
    }
    if (message.type === "WEB_LAUNCH") {
      if (!isWebsiteSender(sender)) { sendResponse({ ok: false, error: "UNTRUSTED_ORIGIN" }); return false; }
      const prompt = normalizePrompt(message.request.prompt);
      const modelIds = message.request.modelIds.filter((id): id is ModelId => MODEL_IDS.includes(id));
      if (!prompt || modelIds.length !== message.request.modelIds.length || modelIds.length === 0) {
        sendResponse({ ok: false, error: "INVALID_REQUEST" });
        return false;
      }
      void runner.start({
        prompt, modelIds, autoSubmit: message.request.autoSubmit, groupTabs: true, recordLogs: false
      }).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false, error: "TASK_FAILED" }));
      return true;
    }
    return false;
  });
  void runner.resume();
}
