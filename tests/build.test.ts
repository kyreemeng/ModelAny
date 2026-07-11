import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

const exec = promisify(execFile);

describe("production build", () => {
  it("emits every extension entry and correctly sized PNG icons", async () => {
    await exec("npm", ["run", "build"]);
    const expected = [
      "manifest.json", "popup.html", "options.html", "service-worker.js",
      "popup.css", "options.css",
      "content-doubao.js", "content-qwen.js", "content-deepseek.js", "content-kimi.js", "content-glm.js",
      "content-wenxin.js", "content-chatgpt.js",
      "icons/icon16.png", "icons/icon32.png", "icons/icon48.png", "icons/icon128.png",
      "icons/models/doubao.png", "icons/models/qwen.png", "icons/models/deepseek.ico",
      "icons/models/kimi.ico", "icons/models/glm.ico", "icons/models/wenxin.ico", "icons/models/chatgpt.svg"
    ];
    await Promise.all(expected.map((path) => access(`dist/${path}`)));
    for (const size of [16, 32, 48, 128]) {
      const icon = PNG.sync.read(await readFile(`dist/icons/icon${size}.png`));
      expect([icon.width, icon.height]).toEqual([size, size]);
      expect(icon.alpha).toBe(true);
    }
    const icon128 = PNG.sync.read(await readFile("dist/icons/icon128.png"));
    const backgroundPixel = Array.from(icon128.data.slice((12 * 128 + 12) * 4, (12 * 128 + 12) * 4 + 3));
    expect(backgroundPixel).toEqual([25, 131, 255]);
    const readme = await readFile("README.md", "utf8");
    expect(readme).not.toContain("`scripting`");
    const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8")) as {
      icons: Record<string, string>;
    };
    expect(manifest.icons["128"]).toBe("icons/icon128.png");
  }, 30_000);
});
