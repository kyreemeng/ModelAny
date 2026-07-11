import type { ModelResultCode } from "./types";

export const ERROR_MESSAGES: Record<ModelResultCode, string> = {
  PENDING: "等待处理",
  FILLED: "已填入，请手动发送",
  SUBMITTED: "已自动提交",
  NOT_LOGGED_IN: "尚未登录，请在页面完成登录",
  INPUT_NOT_FOUND: "未找到输入框，页面结构可能已更新",
  SUBMIT_NOT_FOUND: "内容已填入，但未找到可用的发送按钮",
  TAB_CLOSED: "目标标签页已关闭",
  PAGE_TIMEOUT: "页面响应超时，请稍后重试",
  UNEXPECTED_ERROR: "发生未预期错误"
};
