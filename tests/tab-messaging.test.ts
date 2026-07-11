import { describe, expect, it, vi } from "vitest";
import { classifyDeliveryError, DeliveryError, sendMessageWithRetry } from "../src/background/tab-messaging";

describe("content-script messaging", () => {
  it("briefly retries a freshly loaded tab until the content script connects", async () => {
    const send = vi.fn()
      .mockRejectedValueOnce(new Error("Could not establish connection. Receiving end does not exist."))
      .mockRejectedValueOnce(new Error("Could not establish connection. Receiving end does not exist."))
      .mockResolvedValue({ status: "FILLED" });
    const sleeps: number[] = [];
    const result = await sendMessageWithRetry(3, { type: "FILL_PROMPT" }, {
      send, sleep: async (ms) => { sleeps.push(ms); }, now: () => 1_000
    }, 15_000);
    expect(result).toEqual({ status: "FILLED" });
    expect(send).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([250, 500]);
  });

  it("stops retrying at the shared model deadline", async () => {
    const send = vi.fn().mockRejectedValue(new Error("Receiving end does not exist."));
    let now = 14_900;
    await expect(sendMessageWithRetry(3, {}, {
      send,
      sleep: async () => { now = 15_001; },
      now: () => now
    }, 15_000)).rejects.toMatchObject({ code: "PAGE_TIMEOUT" });
  });

  it("classifies closed tabs and load timeouts precisely", async () => {
    await expect(classifyDeliveryError(new Error("anything"), 4, async () => false)).resolves.toBe("TAB_CLOSED");
    await expect(classifyDeliveryError(new DeliveryError("TAB_CLOSED", "closed during load"), undefined, async () => true)).resolves.toBe("TAB_CLOSED");
    await expect(classifyDeliveryError(Object.assign(new Error("late"), { code: "PAGE_TIMEOUT" }), 4, async () => true)).resolves.toBe("PAGE_TIMEOUT");
    await expect(classifyDeliveryError(new Error("other"), 4, async () => true)).resolves.toBe("UNEXPECTED_ERROR");
  });
});
