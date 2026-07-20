export type Locale = "zh-CN" | "en";
export type LocalePreference = "auto" | Locale;

type TranslationKey =
  | "tagline" | "openSettings" | "promptLabel" | "promptPlaceholder" | "localOnly"
  | "models" | "selectAll" | "clearAll" | "autoSubmit" | "autoSubmitHint"
  | "recentHistory" | "sendEmpty" | "selectModel" | "sendToModels" | "completed"
  | "delete" | "deleteHistoryLabel" | "history" | "clearHistory" | "returnToModels"
  | "truncated" | "sendFailed" | "sendComplete" | "settingsTitle" | "settingsSubtitle"
  | "generalSettings" | "autoSubmitSettings" | "autoSubmitSettingsHint" | "groupTabs"
  | "groupTabsHint" | "localMetrics" | "localMetricsHint" | "modelManagement"
  | "dataManagement" | "dataManagementHint" | "resetAll" | "diagnostics"
  | "diagnosticsHint" | "runDiagnostics" | "closeDiagnosticTabs" | "feedback"
  | "feedbackHint" | "sendFeedback" | "about" | "privacyStatement" | "officialWebsite"
  | "settingsSaved" | "formationSaved" | "clearHistoryConfirm" | "clearHistoryDone"
  | "resetAllConfirm" | "resetAllDone" | "cancel" | "confirm" | "checking"
  | "dangerTitle" | "diagnosticTabsClosed" | "diagnosticNormal" | "diagnosticError" | "modelNeedsLogin" | "inputNotFound"
  | "pageTimeout" | "languageGroup" | "languageZh" | "languageEn" | "githubStar";

const messages: Record<Locale, Record<TranslationKey, string>> = {
  "zh-CN": {
    tagline: "一次提问，多模型回答，找到更好的答案",
    openSettings: "打开设置",
    promptLabel: "您想问什么？",
    promptPlaceholder: "输入要同时发送的问题…",
    localOnly: "纯文本 · 本地保存",
    models: "模型列表",
    selectAll: "全选",
    clearAll: "清空",
    autoSubmit: "自动发送",
    autoSubmitHint: "文本自动发送到指定模型对话框",
    recentHistory: "最近记录",
    sendEmpty: "请输入问题",
    selectModel: "请选择至少一个模型",
    sendToModels: "发送到 {count} 个模型",
    completed: "已完成 {completed}/{total}",
    delete: "删除",
    deleteHistoryLabel: "删除 {time} 的历史记录",
    history: "最近 20 条",
    clearHistory: "全部清空",
    returnToModels: "返回编队",
    truncated: "已截断至 5000 个字符",
    sendFailed: "发送任务创建失败",
    sendComplete: "批量发送完成🎉，请查看各模型结果",
    settingsTitle: "ModelAny 设置",
    settingsSubtitle: "设置您的插件选项与可用模型",
    generalSettings: "通用设置",
    autoSubmitSettings: "自动提交",
    autoSubmitSettingsHint: "填充后点击发送按钮",
    groupTabs: "标签页分组",
    groupTabsHint: "将本轮标签页归为同一组",
    localMetrics: "本地指标",
    localMetricsHint: "保留不含提问内容的诊断日志",
    modelManagement: "模型管理",
    dataManagement: "数据管理",
    dataManagementHint: "草稿、历史和日志只存储在浏览器本地。",
    resetAll: "重置全部数据",
    diagnostics: "诊断",
    diagnosticsHint: "打开模型页面后填入“ModelAny”，仅检测页面能否正常打开、是否已登录、能否输入文本，不会提交内容。",
    runDiagnostics: "开始诊断",
    closeDiagnosticTabs: "关闭诊断标签页",
    feedback: "问题反馈",
    feedbackHint: "遇到无法填充、发送失败或页面改版？欢迎把复现步骤发我，我会尽快修复。",
    sendFeedback: "发送邮件反馈",
    about: "关于",
    privacyStatement: "不上传问题，不使用远程代码，不进行用户追踪。",
    officialWebsite: "访问官网",
    settingsSaved: "设置已保存",
    formationSaved: "模型编队已保存",
    clearHistoryConfirm: "清空全部历史记录？此操作无法撤销。",
    clearHistoryDone: "历史记录已清空",
    resetAllConfirm: "重置草稿、模型、设置、历史、日志和任务？",
    resetAllDone: "全部本地数据已重置",
    cancel: "取消",
    confirm: "确认",
    dangerTitle: "确认危险操作",
    diagnosticTabsClosed: "诊断标签页已关闭",
    checking: "检测中",
    diagnosticNormal: "正常",
    diagnosticError: "异常",
    modelNeedsLogin: "需要登录",
    inputNotFound: "未找到输入框",
    pageTimeout: "页面超时",
    languageGroup: "界面语言",
    languageZh: "中文",
    languageEn: "EN",
    githubStar: "在 GitHub 上给我们点个 Star"
  },
  en: {
    tagline: "Ask once, compare answers from multiple AI models.",
    openSettings: "Open settings",
    promptLabel: "What would you like to ask?",
    promptPlaceholder: "Enter a question to send to multiple models…",
    localOnly: "Plain text · saved locally",
    models: "Models",
    selectAll: "Select all",
    clearAll: "Clear",
    autoSubmit: "Send automatically",
    autoSubmitHint: "Send text automatically in each selected model chat.",
    recentHistory: "Recent history",
    sendEmpty: "Enter a question",
    selectModel: "Select at least one model",
    sendToModels: "Send to {count} models",
    completed: "Completed {completed}/{total}",
    delete: "Delete",
    deleteHistoryLabel: "Delete history from {time}",
    history: "Latest 20",
    clearHistory: "Clear all",
    returnToModels: "Back to models",
    truncated: "Limited to 5,000 characters",
    sendFailed: "Could not create the send task",
    sendComplete: "Sent to all selected models 🎉 Check their responses.",
    settingsTitle: "ModelAny Settings",
    settingsSubtitle: "Manage extension preferences and available models.",
    generalSettings: "General",
    autoSubmitSettings: "Auto-submit",
    autoSubmitSettingsHint: "Click Send after filling the prompt.",
    groupTabs: "Group tabs",
    groupTabsHint: "Group tabs from the same run together.",
    localMetrics: "Local diagnostics",
    localMetricsHint: "Keep diagnostic logs without prompt content.",
    modelManagement: "Manage models",
    dataManagement: "Data",
    dataManagementHint: "Drafts, history, and logs are stored only in your browser.",
    resetAll: "Reset all data",
    diagnostics: "Diagnostics",
    diagnosticsHint: "Open each model page and fill in “ModelAny” to check page access, sign-in status, and text input. No content is submitted.",
    runDiagnostics: "Run diagnostics",
    closeDiagnosticTabs: "Close diagnostic tabs",
    feedback: "Feedback",
    feedbackHint: "Having trouble filling a prompt, sending it, or using an updated site? Send reproduction steps and we'll investigate.",
    sendFeedback: "Email feedback",
    about: "About",
    privacyStatement: "Your prompts are not uploaded. No remote code or user tracking is used.",
    officialWebsite: "Visit website",
    settingsSaved: "Settings saved",
    formationSaved: "Model selection saved",
    clearHistoryConfirm: "Clear all history? This cannot be undone.",
    clearHistoryDone: "History cleared",
    resetAllConfirm: "Reset drafts, models, settings, history, logs, and tasks?",
    resetAllDone: "All local data has been reset",
    cancel: "Cancel",
    confirm: "Confirm",
    dangerTitle: "Confirm action",
    diagnosticTabsClosed: "Diagnostic tabs closed",
    checking: "Checking",
    diagnosticNormal: "Working",
    diagnosticError: "Error",
    modelNeedsLogin: "Sign-in required",
    inputNotFound: "Input not found",
    pageTimeout: "Page timed out",
    languageGroup: "Language",
    languageZh: "中文",
    languageEn: "EN",
    githubStar: "Star us on GitHub"
  }
};

export const getLocale = (preference: LocalePreference = "auto"): Locale => {
  if (preference !== "auto") return preference;
  const languages = typeof navigator === "undefined" ? [] : [navigator.language, ...(navigator.languages ?? [])];
  const timeZone = typeof Intl === "undefined" ? "" : Intl.DateTimeFormat().resolvedOptions().timeZone;
  return languages.some((language) => language?.toLowerCase().startsWith("zh")) || timeZone === "Asia/Shanghai"
    ? "zh-CN"
    : "en";
};

export const t = (key: TranslationKey, values: Record<string, string | number> = {}, locale = getLocale()): string =>
  messages[locale][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));

export const websiteUrl = (locale = getLocale()): string =>
  locale === "zh-CN" ? "https://www.modelany.app/zh/" : "https://modelany.app/";

export const applyStaticTranslations = (locale = getLocale()): void => {
  document.documentElement.lang = locale;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n as TranslationKey, {}, locale);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel as TranslationKey, {}, locale));
  });
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder as TranslationKey, {}, locale);
  });
  document.querySelectorAll<HTMLAnchorElement>("[data-website-link]").forEach((element) => {
    element.href = websiteUrl(locale);
  });
  syncLanguageSwitch(locale);
};

export const syncLanguageSwitch = (locale: Locale): void => {
  document.querySelectorAll<HTMLElement>(".lang-switch").forEach((group) => {
    group.setAttribute("aria-label", t("languageGroup", {}, locale));
    group.querySelectorAll<HTMLButtonElement>("[data-locale]").forEach((button) => {
      const active = button.dataset.locale === locale;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    });
  });
};

export const bindLanguageSwitch = (
  root: ParentNode,
  currentLocale: Locale,
  onSelect: (locale: Locale) => void | Promise<void>
): void => {
  syncLanguageSwitch(currentLocale);
  root.querySelectorAll<HTMLButtonElement>(".lang-switch [data-locale]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.locale === "en" ? "en" : "zh-CN";
      if (next === currentLocale) return;
      void onSelect(next);
    });
  });
};
