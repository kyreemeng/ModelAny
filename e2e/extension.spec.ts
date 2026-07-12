import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, expect, test } from "@playwright/test";

test("loads the MV3 extension and exercises the popup", async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(path.join(tmpdir(), "modelany-e2e-"));
  const extensionPath = path.resolve("dist");
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ?? "/Users/kyree/MyHermesBrowsers/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  try {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    const page = await context.newPage();
    await page.setViewportSize({ width: 80, height: 600 });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).width)).toBe("420px");
    await expect(page.getByRole("heading", { name: "ModelAny" })).toBeVisible();
    const settingsButton = page.getByRole("button", { name: "打开设置" });
    await expect.poll(() => settingsButton.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)))
      .toBeGreaterThanOrEqual(20);
    await expect.poll(() => settingsButton.evaluate((element) => element.getBoundingClientRect().width))
      .toBeGreaterThanOrEqual(44);
    await expect(page.locator(".model-card img")).toHaveCount(8);
    await expect.poll(() => page.locator(".model-card").first().evaluate((element) => element.getBoundingClientRect().height))
      .toBeLessThanOrEqual(38);
    await expect.poll(() => page.locator(".model-grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length))
      .toBe(4);
    await expect(page.getByRole("button", { name: "请输入问题" })).toBeDisabled();
    await page.getByRole("textbox", { name: "您想问什么？" }).fill("比较 TypeScript 与 JavaScript 的适用场景");
    await expect(page.getByRole("button", { name: "发送到 8 个模型" })).toBeEnabled();

    await page.getByRole("button", { name: "清空" }).click();
    await expect(page.getByRole("button", { name: "请选择至少一个模型" })).toBeDisabled();
    await page.getByRole("button", { name: "全选" }).click();
    await expect(page.getByRole("button", { name: "发送到 8 个模型" })).toBeEnabled();

    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await expect(page.getByRole("heading", { name: "ModelAny 设置" })).toBeVisible();
    await expect(page.getByLabel("自动提交")).toBeChecked();
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
