import { describe, expect, it } from "vitest";
import { parseWebsiteLaunchRequest } from "../src/web-bridge/protocol";
import { isWebsiteSender } from "../src/background/service-worker";

describe("website bridge protocol", () => {
  it("accepts a bounded, whitelisted request from ModelAny", () => {
    expect(parseWebsiteLaunchRequest({
      type: "MODELANY_LAUNCH_REQUEST",
      nonce: "d884c9c7-18d9-4a17-ae7d-13d5d0c05e64",
      payload: {
        prompt: "Compare two implementation approaches.",
        modelIds: ["chatgpt", "deepseek"],
        autoSubmit: false,
      },
    })).toEqual({
      prompt: "Compare two implementation approaches.",
      modelIds: ["chatgpt", "deepseek"],
      autoSubmit: false,
    });
  });

  it("rejects unbounded prompts, unrecognized models, and missing consent", () => {
    expect(parseWebsiteLaunchRequest({
      type: "MODELANY_LAUNCH_REQUEST",
      nonce: "nonce",
      payload: { prompt: "x".repeat(5001), modelIds: ["chatgpt"], autoSubmit: false },
    })).toBeUndefined();
    expect(parseWebsiteLaunchRequest({
      type: "MODELANY_LAUNCH_REQUEST",
      nonce: "nonce",
      payload: { prompt: "Test", modelIds: ["unknown"], autoSubmit: false },
    })).toBeUndefined();
    expect(parseWebsiteLaunchRequest({
      type: "MODELANY_LAUNCH_REQUEST",
      nonce: "nonce",
      payload: { prompt: "Test", modelIds: ["chatgpt"] },
    })).toBeUndefined();
  });

  it("allows only messages whose sender is the canonical website origin", () => {
    expect(isWebsiteSender({ origin: "https://modelany.app", url: "https://modelany.app/" })).toBe(true);
    expect(isWebsiteSender({ origin: "https://attacker.example", url: "https://modelany.app/" })).toBe(false);
    expect(isWebsiteSender({ url: "https://modelany.app.evil.example/" })).toBe(false);
  });
});
