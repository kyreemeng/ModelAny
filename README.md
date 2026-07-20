<div align="center">
  <img src="src/assets/modelany-icon-master.png" alt="ModelAny" width="180">
  <h1>ModelAny</h1>
  <p><strong>Ask every AI model, all at once.</strong><br>一次提问，同时比较多个 AI 模型的回答。</p>
  <p>
    <a href="https://github.com/kyreemeng/ModelAny"><img src="https://img.shields.io/badge/Manifest-V3-4285F4?style=flat-square" alt="Manifest V3"></a>
    <a href="https://github.com/kyreemeng/ModelAny"><img src="https://img.shields.io/badge/Chrome-Extension-111827?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension"></a>
    <a href="https://github.com/kyreemeng/ModelAny"><img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  </p>
</div>

> 不必在多个 AI 标签页之间来回复制。<br>
> 输入一次问题，选择模型，同时打开 ChatGPT、Gemini、DeepSeek 等 AI 对话并比较回答。

用同一个问题，快速获得不同模型的思路、答案与视角。<br>
少一些复制粘贴，多一些比较与思考。

**One question. Many AI models. Wider perspectives.**<br>
**一个问题，多个 AI 模型，更广的视角。**

适合研究、写作、编程、学习、头脑风暴和日常决策。

> **ModelAny — Ask once. Think wider.**<br>
> **ModelAny —— 问一次，看得更广。**

## 为什么使用 ModelAny？

| | |
|---|---|
| ⚡ **一次提问，多模型回答** | 输入一次问题，同时询问你选择的模型 |
| 🧠 **更快比较视角** | 并排查看不同模型的思路和答案 |
| 🎯 **自动打开对话** | 为每个模型打开独立对话标签页并填入问题 |
| 🚀 **可选自动发送** | 自动提交，或保留内容供你确认 |
| 🗂️ **保持对话有序** | 将同一轮打开的标签页自动分组 |
| 🔒 **本地优先隐私** | 草稿、设置和历史记录保存在浏览器本地 |

## 支持的 AI 模型

- GLM
- Kimi
- ChatGPT
- Gemini
- DeepSeek
- Qwen（通义千问）
- Doubao（豆包）
- Wenxin（文心）

模型网站的页面结构可能变化。ModelAny 使用语义选择器识别输入框和发送控件，并提供诊断功能帮助定位页面适配问题。

## 使用方式

1. 在 Chrome 中登录你想使用的 AI 模型网站。
2. 点击浏览器工具栏中的 ModelAny 图标。
3. 输入一条问题，最多支持 5000 个 Unicode 字符。
4. 选择一个或多个模型。
5. 按需开启“自动发送”，点击发送。
6. ModelAny 会为选中的模型打开独立对话页面，并填入同一条问题。

也可以在网页中选中文字，右键选择 **“使用 ModelAny 提问”**，直接将选中文本带入扩展。

## 安装

ModelAny 支持从 Chrome Web Store 安装，也可以在本地以开发者模式加载。

### 下载

- [访问 ModelAny 官网](https://www.modelany.app/)
- [在 GitHub 上给 ModelAny 点个 Star](https://github.com/kyreemeng/ModelAny)

Chrome Web Store 版本可从[官方网站](https://www.modelany.app/)安装；Microsoft Edge 版本正在审核中。

### 1. 获取项目

```bash
git clone https://github.com/kyreemeng/ModelAny.git
cd ModelAny
```

### 2. 安装依赖并构建

需要 Node.js 22 或更高版本。

```bash
npm install
npm run build
```

### 3. 加载扩展

1. 打开 Chrome 的 `chrome://extensions`。
2. 开启右上角的 **开发者模式**。
3. 点击 **加载已解压的扩展程序**。
4. 选择项目中的 `dist` 目录。
5. 点击浏览器工具栏中的 ModelAny 图标开始使用。

修改代码后重新运行 `npm run build`，再回到 `chrome://extensions` 点击扩展的“重新加载”。

## 隐私与安全

- 问题只发送到你主动选择的模型网站。
- 不上传问题、历史记录或诊断日志到 ModelAny 服务器。
- 草稿、设置、历史、任务状态和日志只保存在 `chrome.storage.local`。
- 不加载远程代码，不使用 `eval`。
- Host permissions 仅限支持的 AI 官方域名。
- 不尝试绕过验证码、登录验证、风控或平台安全机制。

## 开发

```bash
npm install
npm run check       # TypeScript 类型检查
npm test            # 单元测试
npm run build       # 构建 dist
npm run package     # 生成 Chrome 商店提交包
npm run test:e2e    # Chromium 扩展端到端测试
```

端到端测试默认使用本机 Chromium。其他环境可通过
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定 Chromium 可执行文件。

项目结构：

```text
src/
├── background/     Service Worker、任务调度、标签页通信
├── content/        各模型页面的输入与发送适配器
├── options/        设置页与诊断
├── popup/          浏览器弹窗主界面
└── shared/         模型配置、存储、类型与校验
```

## 排错

- **需要登录**：在对应模型页面完成登录后，重新发送。
- **未找到输入框**：确认页面已加载完成，并在设置页运行诊断。
- **自动发送失败**：关闭自动发送后重试，或在模型页面手动点击发送。
- **页面超时**：确认网络可用，再重新发送。
- **页面结构变化**：在设置页保留诊断标签页，并更新 `src/shared/models.ts` 中对应模型的选择器。

## 反馈与贡献

如果你发现问题或有改进建议，欢迎提交 GitHub Issue。欢迎反馈使用体验和适配问题。

反馈邮箱：**kyreemeng@gmail.com**

请注意：本项目源码公开用于学习、评估和反馈，但不接受未经授权的二次开发、重新打包、应用商店上架或商业使用。具体权利和限制请参阅 [LICENSE](./LICENSE)。

## License

ModelAny 使用自定义专有许可证。源码公开可见，但保留全部权利；未经书面许可，不得复制、修改、分发、重新打包、上架应用商店、创建衍生插件或用于商业目的。

详见 [LICENSE](./LICENSE)。
