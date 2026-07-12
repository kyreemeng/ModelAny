# ModelAny

ModelAny 是一个 Manifest V3 Chrome 扩展，可将同一段纯文本问题派发到多个 AI 模型。

## 开发与构建

需要 Node.js 22 或更高版本。

```bash
npm install
npm run check
npm test
npm run build
npm run test:e2e
```

端到端测试默认使用本机 Hermes Chromium；其他环境可通过
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定 Chromium 可执行文件。

在 Chrome 打开 `chrome://extensions`，启用“开发者模式”，选择“加载已解压的扩展程序”，加载本项目的 `dist` 目录。使用前请分别登录需要启用的模型网站。

## 使用

1. 点击扩展图标，输入不超过 5000 个 Unicode 字符的问题。
2. 选择模型编队，按需启用自动提交。
3. 点击发射或按 Cmd/Ctrl+Enter。
4. 可在弹窗查看最近 20 条历史，在设置页管理选项、运行诊断并导出最近 50 条脱敏日志。
5. 也可以选中网页文字后使用“使用 ModelAny 提问”右键菜单。

关闭弹窗不会取消后台任务。任务进度、草稿、设置和日志保存在 `chrome.storage.local`。

## 权限说明

- `storage`：保存草稿、设置、历史、任务状态和脱敏日志。
- `tabs`、`tabGroups`：打开五个模型页面并按轮次分组。
- `contextMenus`：提供选中文字入口。
- `alarms`：唤醒 Service Worker 恢复或清理任务。
- Host permissions 仅限五个受支持模型的官方域名。

扩展不加载远程代码，不使用 `eval`，不会上传提问或日志。

## 排错

- “需要登录”：打开对应标签页完成登录后重试。
- “未找到输入框/发送按钮”：目标网站 DOM 可能已改版；在设置页运行诊断，保留标签页检查实际页面结构，再更新 `src/shared/models.ts` 中该模型的语义选择器。
- 自动提交失败时，已安全填入的文本会保留，可手动提交。
- 页面超时：确认网络可用并重新派发。

网页自动化受各平台页面变化和限制影响。请勿尝试绕过验证码、风控或平台安全机制。
