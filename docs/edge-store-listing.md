# Microsoft Edge Add-ons 提交资料

本文档对应 ModelAny 在 Microsoft Edge Add-ons Partner Center 的首次提交。

## 提交配置

- **Package**：`ModelAny-edge-v1.0.1.zip`
- **Name**：`ModelAny`
- **Markets**：All markets / Worldwide
- **Languages**：English、Chinese (Simplified)
- **Category**：Productivity
- **Support URL**：`https://github.com/kyreemeng/PromptVolley`
- **Privacy policy URL**：`https://github.com/kyreemeng/PromptVolley/blob/main/PRIVACY.md`
- **Website URL**：`https://github.com/kyreemeng/PromptVolley`

如果仓库默认分支不是 `main`，请将隐私政策链接中的 `main` 替换为实际默认分支。

## English store listing

### Short description

Send one prompt to multiple AI models at once. Compare answers, perspectives, and ideas faster with ModelAny.

### Detailed description

ModelAny helps you ask once and think wider.

Stop copying the same prompt between multiple AI tabs. Enter your question once, select the models you want, and ModelAny opens their conversations and fills the same prompt for you.

Use ModelAny to compare different AI perspectives for writing, programming, research, brainstorming, learning, and everyday decisions. You can choose automatic submission or keep the prompt filled for a manual review before sending.

Supported AI websites:

- GLM
- Kimi
- ChatGPT
- Gemini
- DeepSeek
- Qwen
- Doubao
- Wenxin

Features:

- Send one prompt to multiple AI models
- Automatically open selected model conversations
- Fill prompts and optionally submit them automatically
- Select all models or choose a custom group
- Group the tabs opened for the current task
- Keep drafts and recent history locally in your browser
- Run a diagnostic that checks whether a model page loads, is signed in, and accepts text input
- Use selected webpage text as a prompt from the context menu

ModelAny does not upload your prompts to a ModelAny server. Prompts are sent directly to the AI websites you select, and those websites process the content under their own privacy policies.

One prompt. Multiple models. Better answers.

## 简体中文商店信息

### 简短描述

一条提示词，同时发送到多个 AI 模型。快速比较不同答案、思路与视角。

### 详细描述

ModelAny 帮你问一次，看得更广。

不必在多个 AI 标签页之间来回复制同一条问题。输入一次，选择需要使用的模型，ModelAny 会自动打开对应的对话页面，并将相同的问题填入其中。

无论是写作、编程、研究、头脑风暴、学习还是日常决策，你都可以用 ModelAny 快速比较不同 AI 的思路与答案。你可以开启自动发送，也可以只填入文本，在发送前手动检查。

支持的 AI 网站：

- 智谱 GLM
- Kimi
- ChatGPT
- Gemini
- DeepSeek
- 通义千问
- 豆包
- 文心

主要功能：

- 一条提示词发送到多个 AI 模型
- 自动打开选中的模型对话页面
- 自动填入文本，可选择自动发送
- 支持全选模型或自定义模型组合
- 将本轮打开的标签页归为同一组
- 草稿和最近记录保存在浏览器本地
- 诊断模型页面是否可以打开、是否已登录、是否可以输入文本
- 在网页中选中文字后，通过右键菜单直接提问

ModelAny 不会将你的问题上传到 ModelAny 服务器。问题只会发送到你主动选择的 AI 网站，并由这些网站依据各自的隐私政策处理。

一次提问，多模型回答，找到更好的答案。

## Store assets

上传以下素材：

- **Extension logo**：`store-assets/modelany-logo-300.png`
- **Small promotional tile**：`store-assets/tile-small.png`
- **Large promotional tile**：`store-assets/tile-large.png`
- **Screenshot 1**：`store-assets/screenshot-overview.png`
- **Screenshot 2**：`store-assets/screenshot-settings.png`

素材尺寸：

- Logo：300 × 300
- Small promotional tile：440 × 280
- Large promotional tile：1400 × 560
- Screenshots：1280 × 800

English 和 Chinese (Simplified) 可以先上传同一组视觉素材，再分别填写对应语言的名称与描述。

## Privacy page answers

按当前代码行为填写：

- **Does the extension access personal information?** Yes
- **Does the extension collect personal information?** No
- **Does the extension transmit personal information?** Yes, to the AI websites explicitly selected by the user
- **Does the extension sell personal information?** No
- **Does the extension use personal information for advertising?** No
- **Does the extension use analytics or tracking?** No
- **Does the extension use remote code?** No
- **Privacy policy URL**：`https://github.com/kyreemeng/PromptVolley/blob/main/PRIVACY.md`

数据用途说明可填写：

> ModelAny processes user-provided prompts only to fill and optionally submit them on AI websites explicitly selected by the user. Drafts, settings, history, task status, and diagnostic results are stored locally in the browser extension storage. ModelAny does not send this data to its own server, does not sell it, and does not use it for advertising or analytics.

## Permission justifications

### `storage`

Stores drafts, model selections, extension settings, history, task state, and local execution results in `chrome.storage.local`.

### `tabs`

Creates and manages the model conversation tabs selected by the user, waits for page loading, sends messages to the tabs, and closes diagnostic tabs when requested.

### `tabGroups`

Groups the model tabs opened for one task when the user enables tab grouping.

### `contextMenus`

Adds the “Use ModelAny to ask” command for selected webpage text.

### `alarms`

Wakes the service worker periodically to resume unfinished local tasks and clean up task state.

### Host permissions

The extension needs access only to the supported AI websites because it must detect their chat input, fill the user's prompt, and optionally activate their send control:

- `www.doubao.com`
- `www.qianwen.com`
- `chat.deepseek.com`
- `www.kimi.com`
- `chatglm.cn`
- `gemini.google.com`
- `wenxin.baidu.com`
- `chat.baidu.com`
- `yiyan.baidu.com`
- `chatgpt.com`
- `www.chatgpt.com`
- `chat.openai.com`

## Review test instructions

### Test account and setup

No ModelAny account is required. The reviewer should use their own accounts on any supported AI websites they want to test.

1. Install the submitted extension.
2. Open the extension popup.
3. Sign in to at least two supported AI websites in separate browser tabs.
4. Open ModelAny and select the same models.

### Test automatic filling and sending

1. Enter a short prompt such as `用一句话介绍人工智能。`
2. Enable **自动发送**.
3. Click the send button.
4. Confirm that a tab opens for each selected model.
5. Confirm that the prompt is filled into each selected AI conversation.
6. Confirm that each selected conversation receives the prompt.

### Test manual review mode

1. Disable **自动发送**.
2. Enter a prompt and select two models.
3. Click send.
4. Confirm that the prompt is filled but not submitted automatically.

### Test diagnostics

1. Open Settings.
2. Click **开始诊断**.
3. Confirm that diagnostic tabs open for the configured models.
4. Confirm that the diagnostic enters `ModelAny` into an available input after the page loads.
5. Confirm that the result reports page/login/input status without submitting the test text.
6. Click **关闭诊断标签页**.

### Test local controls

1. Confirm that drafts and recent history are available after reopening the popup.
2. Confirm that tab grouping can be enabled or disabled in Settings.
3. Confirm that reset and clear-history actions remove local data.
4. Confirm that no external ModelAny server is contacted.

## Submission checklist

- [ ] Upload `ModelAny-edge-v1.0.1.zip`
- [ ] Select All markets / Worldwide
- [ ] Add English and Chinese (Simplified)
- [ ] Enter the English and Chinese listing text above
- [ ] Upload the 300 × 300 logo
- [ ] Upload the 440 × 280 small tile
- [ ] Upload the 1400 × 560 large tile
- [ ] Upload both 1280 × 800 screenshots
- [ ] Complete the Privacy page
- [ ] Add the privacy policy URL
- [ ] Add permission justifications
- [ ] Add review test instructions
- [ ] Validate the package
- [ ] Submit for certification
