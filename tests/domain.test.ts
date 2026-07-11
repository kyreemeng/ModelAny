import { describe, expect, it } from "vitest";
import { MODEL_IDS, MODELS, getModelById, isAllowedModelHost } from "../src/shared/models";
import { countCodePoints, limitCodePoints, normalizePrompt } from "../src/shared/validation";

describe("Unicode prompt validation", () => {
  it("counts Unicode code points and preserves line breaks", () => {
    expect(countCodePoints("中文🙂\n")).toBe(4);
    expect(limitCodePoints("a🙂b", 2)).toBe("a🙂");
  });

  it("normalizes blank prompts and truncates at 5000 code points", () => {
    expect(normalizePrompt(" \n\t")).toBe("");
    expect(countCodePoints(normalizePrompt(`${"问".repeat(4999)}🙂尾`))).toBe(5000);
  });
});

describe("model adapters", () => {
  it("keeps the approved provider order and complete adapter metadata", () => {
    expect(MODEL_IDS).toEqual(["doubao", "qwen", "deepseek", "kimi", "glm", "wenxin", "chatgpt"]);
    for (const model of MODELS) {
      expect(model.url).toMatch(/^https:\/\//);
      expect(model.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(model.inputSelectors.length).toBeGreaterThan(1);
      expect(model.submitSelectors.length).toBeGreaterThan(1);
      expect(model.iconPath).toMatch(/^icons\/models\/.+\.(png|ico|svg)$/);
      expect(getModelById(model.id)).toBe(model);
    }
  });

  it("accepts only the configured provider hostname", () => {
    expect(isAllowedModelHost("doubao", "www.doubao.com")).toBe(true);
    expect(isAllowedModelHost("doubao", "evil.example")).toBe(false);
    expect(isAllowedModelHost("chatgpt", "chat.openai.com")).toBe(true);
    expect(isAllowedModelHost("wenxin", "chat.baidu.com")).toBe(true);
  });

  it("uses the current Qianwen and Kimi domains and known send controls", () => {
    expect(getModelById("qwen")).toMatchObject({
      url: "https://www.qianwen.com/",
      hostname: "www.qianwen.com"
    });
    expect(getModelById("kimi")).toMatchObject({
      url: "https://www.kimi.com/",
      hostname: "www.kimi.com"
    });
    expect(getModelById("doubao").submitSelectors).toContain("#flow-end-msg-send");
    expect(getModelById("deepseek").submitSelectors).toContain("div[role='button'].ds-icon-button");
    expect(getModelById("glm")).toMatchObject({
      url: "https://chatglm.cn/"
    });
    expect(getModelById("glm").inputSelectors).toContain("textarea[slot='reference']");
  });

  it("includes Wenxin and ChatGPT at their official domains", () => {
    expect(getModelById("wenxin")).toMatchObject({
      url: "https://wenxin.baidu.com/new-chat?from=search_brand",
      hostname: "wenxin.baidu.com",
      iconPath: "icons/models/wenxin.ico"
    });
    expect(getModelById("chatgpt")).toMatchObject({
      url: "https://chatgpt.com/",
      hostname: "chatgpt.com",
      iconPath: "icons/models/chatgpt.svg"
    });
    expect(getModelById("qwen").submitSelectors).toContain("button[data-testid*='send']");
  });
});
