# ModelAny Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建覆盖 PRD P0 + P1、可直接加载到 Chrome 的 ModelAny Manifest V3 扩展。

**Architecture:** 原生 TypeScript + Vite 多入口工程。Popup 和设置页调用共享存储层；Service Worker 以持久化任务协调标签页；五个 content-script 入口复用适配器驱动的填充引擎。

**Tech Stack:** TypeScript、Vite、Vitest、jsdom、Chrome Extension Manifest V3、原生 HTML/CSS。

---

## 文件结构

```text
manifest.json                     MV3 清单
package.json                      构建、测试和检查命令
vite.config.ts                    Popup/Options/Worker/Content 多入口构建
scripts/copy-static.mjs           复制 manifest、HTML、图标到 dist
src/shared/types.ts               消息、设置、任务、日志类型
src/shared/models.ts              五模型元数据与适配器
src/shared/storage.ts             chrome.storage.local 仓库
src/shared/validation.ts          Unicode 计数、输入和消息校验
src/shared/errors.ts              错误码到中文提示映射
src/background/service-worker.ts  调度、恢复、右键、分组、诊断
src/content/engine.ts             DOM 查找、填充、提交共享引擎
src/content/{model}.ts            五模型 content-script 入口
src/popup/{index.html,main.ts,style.css}    主界面
src/options/{index.html,main.ts,style.css}  设置与诊断
src/assets/icons/*.png            16/32/48/128 图标
tests/*.test.ts                   单元与集成测试
README.md                         构建、安装、权限、使用、排错
PRIVACY.md                        本地数据与权限说明
```

由于当前目录不是 Git 仓库，且用户未要求创建提交，计划执行中不包含提交步骤。

### Task 1：建立可构建的 MV3 工程

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.json`
- Create: `scripts/copy-static.mjs`
- Create: `.gitignore`
- Test: `tests/manifest.test.ts`

- [ ] 写入失败测试：读取 `manifest.json`，断言 `manifest_version === 3`、仅包含批准权限、五个 host permissions、五个 content script 和本地 CSP。
- [ ] 运行 `npm test -- tests/manifest.test.ts`，预期因清单不存在而失败。
- [ ] 创建 npm 工程和多入口 Vite 配置；`build` 先清空 `dist`，再构建 TS 入口并复制 HTML、manifest 和图标。
- [ ] 创建 MV3 清单：Popup、Options、Service Worker、五个模型 content scripts、快捷权限和最小域名范围。
- [ ] 运行 `npm install && npm run build && npm test -- tests/manifest.test.ts`，预期构建和测试通过。

清单权限固定为：

```json
["storage", "tabs", "tabGroups", "scripting", "contextMenus", "alarms"]
```

### Task 2：定义领域类型、模型和校验

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/models.ts`
- Create: `src/shared/validation.ts`
- Create: `src/shared/errors.ts`
- Test: `tests/validation.test.ts`
- Test: `tests/models.test.ts`

- [ ] 为 `countCodePoints`、`limitCodePoints`、`normalizePrompt` 写测试，覆盖中文、emoji、换行、空白和 5001 字符。
- [ ] 为模型顺序、URL、品牌色、主机匹配和选择器非空写测试。
- [ ] 运行对应测试并确认失败。
- [ ] 定义 `ModelId`、`Settings`、`HistoryItem`、`SendTask`、`ModelTaskResult`、`LogEntry` 和判别联合消息类型。
- [ ] 实现 Unicode code point 计数和截断：

```ts
export const countCodePoints = (value: string) => Array.from(value).length;
export const limitCodePoints = (value: string, max = 5000) =>
  Array.from(value).slice(0, max).join("");
export const normalizePrompt = (value: string) => limitCodePoints(value).trim()
  ? limitCodePoints(value)
  : "";
```

- [ ] 建立严格按豆包、千问、DeepSeek、Kimi、GLM 排列的模型常量和错误文案映射。
- [ ] 运行测试，预期全部通过。

### Task 3：实现持久化存储仓库

**Files:**
- Create: `src/shared/storage.ts`
- Test: `tests/storage.test.ts`

- [ ] 使用 mock `chrome.storage.local` 写失败测试，覆盖默认值、设置合并、历史裁剪至 20、日志裁剪至 50、活动任务恢复和全部重置。
- [ ] 运行测试并确认 `storage.ts` 缺失导致失败。
- [ ] 实现 `getAppState`、`saveDraft`、`saveModelSelection`、`saveSettings`、`addHistory`、`deleteHistory`、`clearHistory`、`appendLogs`、`saveTask`、`getPendingTasks`、`resetAllData`。
- [ ] 所有写操作直接调用 `chrome.storage.local.set`，不以模块全局变量作为事实来源。
- [ ] 运行测试，预期全部通过。

### Task 4：实现共享 Content Script 引擎

**Files:**
- Create: `src/content/engine.ts`
- Test: `tests/content-engine.test.ts`

- [ ] 在 jsdom 中写失败测试，覆盖 textarea 原生 setter、contenteditable、事件触发、备用选择器、登录检测、仅填充、自动提交、提交按钮缺失和超时。
- [ ] 运行测试并确认失败。
- [ ] 实现 `waitForEditable`、`setNativeValue`、`fillContentEditable`、`findSubmitButton` 和 `executeFillCommand`。
- [ ] 引擎每 500ms 轮询，测试通过注入时钟和 `now` 函数避免真实等待。
- [ ] 对消息校验文本不为空、不超过 5000 字符，并验证当前 hostname 属于适配器。
- [ ] 运行测试，预期全部通过。

### Task 5：接入五个模型适配器

**Files:**
- Create: `src/content/doubao.ts`
- Create: `src/content/qwen.ts`
- Create: `src/content/deepseek.ts`
- Create: `src/content/kimi.ts`
- Create: `src/content/glm.ts`
- Test: `tests/adapters.test.ts`

- [ ] 写测试断言每个入口注册一次 `chrome.runtime.onMessage`，且只处理自身模型的 `FILL_PROMPT`。
- [ ] 运行测试并确认入口缺失导致失败。
- [ ] 每个入口从 `models.ts` 读取专属适配器并调用共享 `registerAdapter`。
- [ ] 为每个平台配置语义选择器优先级、登录 URL 特征和提交按钮备用选择器。
- [ ] 运行测试，预期全部通过。

### Task 6：实现可恢复的后台发送任务

**Files:**
- Create: `src/background/task-runner.ts`
- Create: `src/background/service-worker.ts`
- Test: `tests/task-runner.test.ts`

- [ ] 写失败测试覆盖标签页按顺序创建、并行等待、15 秒超时、部分失败、Popup 关闭、Worker 重建恢复、任务日志和标签组标题。
- [ ] 运行测试并确认失败。
- [ ] 实现 `createSendTask`、`runModelTask`、`resumePendingTasks`、`finalizeTask`。
- [ ] 每次状态迁移先持久化再广播 `TASK_PROGRESS`；消息端口断开不得中断任务。
- [ ] 使用 `chrome.tabs.onUpdated` 与 `chrome.tabs.onRemoved`，并为每个模型建立独立 timeout。
- [ ] 成功创建两个以上标签页且设置开启时调用 `chrome.tabs.group`，标题使用问题前 15 个 Unicode 字符。
- [ ] 安装和启动时创建 alarm；alarm 仅恢复或关闭超时任务。
- [ ] 运行测试，预期全部通过。

### Task 7：实现右键菜单和诊断

**Files:**
- Modify: `src/background/service-worker.ts`
- Create: `src/background/diagnostics.ts`
- Test: `tests/background-features.test.ts`

- [ ] 写失败测试覆盖安装菜单、选中文字裁剪保存、打开 Popup 的降级徽标、诊断不填充和诊断标签页关闭。
- [ ] 运行测试并确认失败。
- [ ] 安装时创建 `contexts: ["selection"]` 的“使用 ModelAny 提问”菜单。
- [ ] 点击后保存草稿并调用 `chrome.action.openPopup()`；失败时设置徽标 `!` 和标题提示。
- [ ] 诊断仅发送 `DIAGNOSE`，content script 只检查登录、输入框和提交按钮，不修改 DOM。
- [ ] 运行测试，预期全部通过。

### Task 8：实现 Popup 语义结构与主状态

**Files:**
- Create: `src/popup/index.html`
- Create: `src/popup/main.ts`
- Create: `src/popup/view.ts`
- Test: `tests/popup.test.ts`

- [ ] 写失败测试覆盖状态恢复、Unicode 计数、5000 截断、纯文本粘贴、模型切换、全选/清空、Cmd/Ctrl+Enter 和按钮文案。
- [ ] 运行测试并确认失败。
- [ ] 创建带 label、aria-live、aria-pressed、dialog 语义的 Popup HTML。
- [ ] 实现单一 `PopupState` 和纯渲染函数；输入保存防抖 500ms，开关保存防抖 300ms，unload 强制刷新。
- [ ] 发送时冻结任务快照；五模型且确认开启时使用自定义确认对话框。
- [ ] 订阅任务进度，显示 M/N；重开 Popup 时恢复活动任务。
- [ ] 运行测试，预期全部通过。

### Task 9：完成 Popup 历史与结果体验

**Files:**
- Modify: `src/popup/index.html`
- Modify: `src/popup/main.ts`
- Modify: `src/popup/view.ts`
- Test: `tests/popup-history.test.ts`

- [ ] 写失败测试覆盖历史倒序、时间格式、填回输入框、单条删除、清空、成功/部分失败/全失败 Toast 和“查看结果”。
- [ ] 运行测试并确认失败。
- [ ] 实现内部历史抽屉，不自动发送；失败详情按模型显示建议和打开链接。
- [ ] “查看结果”激活本任务第一个成功标签页。
- [ ] Toast 使用 `aria-live="polite"`，错误使用 `role="alert"`，3 秒自动关闭但失败详情保持。
- [ ] 运行测试，预期全部通过。

### Task 10：实现 B「轻盈 AI 感」样式

**Files:**
- Create: `src/popup/style.css`
- Create: `src/shared/theme.css`
- Test: `tests/accessibility.test.ts`

- [ ] 写静态测试检查可聚焦控件、可访问名称、`prefers-reduced-motion` 和禁止横向溢出。
- [ ] 运行测试并确认样式缺失导致失败。
- [ ] 实现 400px 宽、最大 600px 高、淡蓝紫背景、半透明白色表面、12–16px 圆角和 8px 网格。
- [ ] 两列模型卡片在 360px 以下回退为单列；所有点击目标至少 40px。
- [ ] 开关动画 160ms，系统减少动态效果时禁用非必要动画。
- [ ] 运行测试，预期全部通过。

### Task 11：实现设置、数据管理、日志和导出

**Files:**
- Create: `src/options/index.html`
- Create: `src/options/main.ts`
- Create: `src/options/style.css`
- Create: `src/shared/export.ts`
- Test: `tests/options.test.ts`

- [ ] 写失败测试覆盖设置保存、模型管理、清空历史、重置确认、诊断状态、日志展示和 JSON 脱敏导出。
- [ ] 运行测试并确认失败。
- [ ] 实现通用设置、模型管理、数据管理、诊断和关于五个卡片分区。
- [ ] 导出 JSON 只含版本、时间、浏览器、设置摘要和日志，不含草稿或历史全文。
- [ ] 清空历史和重置全部数据使用原生 `<dialog>` 二次确认。
- [ ] 运行测试，预期全部通过。

### Task 12：图标、文档、全量验证与真实联调

**Files:**
- Create: `src/assets/icons/icon-16.png`
- Create: `src/assets/icons/icon-32.png`
- Create: `src/assets/icons/icon-48.png`
- Create: `src/assets/icons/icon-128.png`
- Create: `README.md`
- Create: `PRIVACY.md`
- Create: `tests/build.test.ts`

- [ ] 生成品牌色字母 P 图标，断言四个 PNG 尺寸和透明通道正确。
- [ ] 编写 README：Node 版本、安装、测试、构建、加载 `dist`、使用、权限解释、模型登录和选择器排错。
- [ ] 编写隐私说明：所有内容仅存本地、不上传、不出售、不追踪。
- [ ] 运行 `npm test`，预期全部测试通过。
- [ ] 运行 `npm run build`，预期 `dist/manifest.json`、两个页面、Worker、五个 content scripts 和四个图标存在。
- [ ] 在 Chrome 加载 `dist`，用五个已登录平台分别验证仅填充与自动提交。
- [ ] 验证中文、英文、emoji、代码块、五模型并发、Popup 关闭恢复、标签组、右键菜单、历史、诊断和日志导出。
- [ ] 若真实 DOM 与配置不同，仅更新对应 `src/shared/models.ts` 选择器并重新执行适配器测试和构建。
- [ ] 运行 `npm test && npm run build` 作为最终门禁，预期退出码 0。
