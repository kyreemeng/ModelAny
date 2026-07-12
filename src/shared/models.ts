import type { ModelId } from "./types";

export interface ModelAdapter {
  id: ModelId;
  name: string;
  shortName: string;
  url: string;
  hostname: string;
  alternateHostnames?: readonly string[];
  color: string;
  iconPath: string;
  inputSelectors: readonly string[];
  submitSelectors: readonly string[];
  loginPathHints: readonly string[];
  loginSelectors: readonly string[];
  readyDelayMs: number;
}

export const MODEL_IDS: readonly ModelId[] = ["glm", "kimi", "chatgpt", "gemini", "deepseek", "qwen", "doubao", "wenxin"];

export const MODELS: readonly ModelAdapter[] = [
  {
    id: "glm", name: "智谱 GLM", shortName: "G", url: "https://chatglm.cn/",
    hostname: "chatglm.cn", color: "#159C8C", iconPath: "icons/models/glm.ico",
    inputSelectors: ["textarea[slot='reference']", "textarea[placeholder]", "[contenteditable='true'][role='textbox']", "[contenteditable='true']", "textarea"],
    submitSelectors: ["button[aria-label*='发送']", "button[class*='send']", "button[type='submit']"],
    loginPathHints: ["/login"], loginSelectors: ["[class*='login']", "button[aria-label*='登录']"], readyDelayMs: 700
  },
  {
    id: "kimi", name: "Kimi", shortName: "K", url: "https://www.kimi.com/",
    hostname: "www.kimi.com", color: "#111827", iconPath: "icons/models/kimi.ico",
    inputSelectors: ["textarea[placeholder*='Ask']", "[contenteditable='true'][role='textbox']", "textarea[placeholder]", "textarea"],
    submitSelectors: ["button[aria-label='Submit']", "button[aria-label*='发送']", "button[data-testid*='send']", "button[type='submit']", ".send-button"],
    loginPathHints: ["/login"], loginSelectors: ["[class*='login']", "button[data-testid*='login']"], readyDelayMs: 700
  },
  {
    id: "chatgpt", name: "ChatGPT", shortName: "C", url: "https://chatgpt.com/",
    hostname: "chatgpt.com", alternateHostnames: ["www.chatgpt.com", "chat.openai.com"], color: "#10A37F", iconPath: "icons/models/chatgpt.svg",
    inputSelectors: ["#prompt-textarea", "textarea[placeholder]", "[contenteditable='true'][role='textbox']", "[contenteditable='true']"],
    submitSelectors: ["button[data-testid='send-button']", "button[aria-label*='Send']", "button[aria-label*='发送']", "button[type='submit']"],
    loginPathHints: ["/auth/login", "/login"], loginSelectors: ["button[data-testid*='login']", "button[class*='login']"], readyDelayMs: 800
  },
  {
    id: "gemini", name: "Gemini", shortName: "G", url: "https://gemini.google.com/",
    hostname: "gemini.google.com", color: "#4285F4", iconPath: "icons/models/gemini.svg",
    inputSelectors: ["rich-textarea [contenteditable='true']", "div[contenteditable='true'][role='textbox']", "[contenteditable='true']", "textarea[placeholder]"],
    submitSelectors: ["button[aria-label*='Send']", "button[aria-label*='发送']", "button[data-testid*='send']", "button[type='submit']"],
    loginPathHints: ["/auth/login"], loginSelectors: ["a[href*='accounts.google.com/ServiceLogin']", "button[aria-label*='Sign in']"], readyDelayMs: 800
  },
  {
    id: "deepseek", name: "DeepSeek", shortName: "D", url: "https://chat.deepseek.com/",
    hostname: "chat.deepseek.com", color: "#4D6BFE", iconPath: "icons/models/deepseek.ico",
    inputSelectors: ["textarea#chat-input", "textarea[placeholder]", "[contenteditable='true']"],
    submitSelectors: ["div[role='button'].ds-icon-button", "button[aria-label*='Send']", "button[aria-label*='发送']", "button[type='submit']"],
    loginPathHints: ["/sign_in", "/login"], loginSelectors: ["form[action*='login']", "button[class*='login']"], readyDelayMs: 500
  },
  {
    id: "qwen", name: "通义千问", shortName: "千", url: "https://www.qianwen.com/",
    hostname: "www.qianwen.com", color: "#6954E8", iconPath: "icons/models/qwen.png",
    inputSelectors: ["textarea.message-input-textarea", "[contenteditable='true'][role='textbox']", "[contenteditable='true'].ProseMirror", "[contenteditable='true']", "textarea[placeholder]", "textarea"],
    submitSelectors: ["button[data-testid*='send']", "button[aria-label*='发送']", "button[aria-label*='Send']", ".message-input-right-button-send", "button[class*='send']", "button[type='submit']"],
    loginPathHints: ["/login"], loginSelectors: ["button[class*='login']", "[class*='login-panel']"], readyDelayMs: 800
  },
  {
    id: "doubao", name: "豆包", shortName: "豆", url: "https://www.doubao.com/chat/",
    hostname: "www.doubao.com", color: "#3B82F6", iconPath: "icons/models/doubao.png",
    inputSelectors: ["textarea[data-testid='chat_input_input']", "textarea[data-testid]", "[contenteditable='true'][role='textbox']", "textarea[placeholder]"],
    submitSelectors: ["#flow-end-msg-send", "button[data-testid='chat_input_send_button']", "button[data-testid*='send']", "button[aria-label*='发送']", "button[type='submit']"],
    loginPathHints: ["/login"], loginSelectors: ["[data-testid*='login']", "button[class*='login']"], readyDelayMs: 600
  },
  {
    id: "wenxin", name: "文心", shortName: "文", url: "https://wenxin.baidu.com/new-chat?from=search_brand",
    hostname: "wenxin.baidu.com", alternateHostnames: ["chat.baidu.com", "yiyan.baidu.com"], color: "#2F6BFF", iconPath: "icons/models/wenxin.ico",
    inputSelectors: ["textarea[placeholder]", "[contenteditable='true'][role='textbox']", "[contenteditable='true']", "textarea"],
    submitSelectors: ["button[aria-label*='发送']", "button[aria-label*='Send']", "button[data-testid*='send']", "button[class*='send']", "button[type='submit']"],
    loginPathHints: ["/login"], loginSelectors: ["[class*='login']", "button[aria-label*='登录']"], readyDelayMs: 800
  }
];

export const getModelById = (id: ModelId): ModelAdapter => {
  const model = MODELS.find((candidate) => candidate.id === id);
  if (!model) throw new Error(`Unsupported model: ${id}`);
  return model;
};

export const isAllowedModelHost = (id: ModelId, hostname: string): boolean =>
  [getModelById(id).hostname, ...(getModelById(id).alternateHostnames ?? [])].includes(hostname);
