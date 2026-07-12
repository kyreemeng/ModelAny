import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("manifest", () => {
  it("uses Manifest V3 with only required permissions", async () => {
    const manifest = JSON.parse(await readFile("manifest.json", "utf8")) as {
      manifest_version: number;
      name: string;
      permissions: string[];
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("ModelAny");
    expect(manifest.permissions).toEqual([
      "storage",
      "tabGroups",
      "contextMenus",
      "alarms"
    ]);
  });

  it("limits host access to supported providers and the verified website bridge", async () => {
    const manifest = JSON.parse(await readFile("manifest.json", "utf8")) as {
      host_permissions: string[];
      content_scripts: Array<{ matches: string[]; js: string[] }>;
    };

    expect(manifest.host_permissions).toHaveLength(13);
    expect(manifest.content_scripts).toHaveLength(9);
    expect(manifest.host_permissions).not.toContain("<all_urls>");
    expect(manifest.host_permissions).toContain("https://www.qianwen.com/*");
    expect(manifest.host_permissions).toContain("https://www.kimi.com/*");
    expect(manifest.host_permissions).not.toContain("https://tongyi.aliyun.com/*");
    expect(manifest.host_permissions).not.toContain("https://kimi.moonshot.cn/*");
    expect(manifest.content_scripts.find(({ js }) => js.includes("content-qwen.js"))?.matches)
      .toEqual(["https://www.qianwen.com/*"]);
    expect(manifest.content_scripts.find(({ js }) => js.includes("content-kimi.js"))?.matches)
      .toEqual(["https://www.kimi.com/*"]);
    expect(manifest.content_scripts.find(({ js }) => js.includes("content-wenxin.js"))?.matches)
      .toEqual(["https://wenxin.baidu.com/*", "https://chat.baidu.com/*", "https://yiyan.baidu.com/*"]);
    expect(manifest.content_scripts.find(({ js }) => js.includes("content-chatgpt.js"))?.matches)
      .toEqual(["https://chatgpt.com/*", "https://www.chatgpt.com/*", "https://chat.openai.com/*"]);
    expect(manifest.host_permissions).toContain("https://gemini.google.com/*");
    expect(manifest.content_scripts.find(({ js }) => js.includes("content-gemini.js"))?.matches)
      .toEqual(["https://gemini.google.com/*"]);
    expect(manifest.host_permissions).toContain("https://modelany.app/*");
    expect(manifest.content_scripts.find(({ js }) => js.includes("content-modelany-bridge.js"))?.matches)
      .toEqual(["https://modelany.app/*"]);
  });
});
