import { describe, expect, it, vi } from "vitest";
import { executeFillCommand, registerAdapter } from "../src/content/engine";
import { getModelById } from "../src/shared/models";

const adapter = { ...getModelById("doubao"), hostname: "localhost" };
const instant = { sleep: async () => undefined, now: (() => { let n = 0; return () => n += 500; })() };

describe("content engine", () => {
  it("honors provider ready delay before searching for input", async () => {
    document.body.innerHTML = `<textarea data-testid="prompt"></textarea>`;
    const sleeps: number[] = [];
    const delayedAdapter = { ...adapter, readyDelayMs: 750 };
    const result = await executeFillCommand(delayedAdapter, { type: "FILL_PROMPT", modelId: "doubao", prompt: "延迟", autoSubmit: false }, {
      ...instant, document, hostname: "localhost", sleep: async (milliseconds) => { sleeps.push(milliseconds); }
    });
    expect(sleeps[0]).toBe(750);
    expect(result.status).toBe("FILLED");
  });

  it("ignores hidden input candidates and uses a visible fallback", async () => {
    document.body.innerHTML = `
      <textarea data-testid="hidden" style="display:none"></textarea>
      <div role="textbox" contenteditable="true"></div>
    `;
    const result = await executeFillCommand(adapter, { type: "FILL_PROMPT", modelId: "doubao", prompt: "可见", autoSubmit: false }, { ...instant, document, hostname: "localhost" });
    expect((document.querySelector("[data-testid='hidden']") as HTMLTextAreaElement).value).toBe("");
    expect(document.querySelector("[contenteditable]")?.textContent).toBe("可见");
    expect(result.status).toBe("FILLED");
  });

  it("ignores inputs hidden by an ancestor", async () => {
    document.body.innerHTML = `
      <div style="display:none"><textarea data-testid="hidden-parent"></textarea></div>
      <div role="textbox" contenteditable="true"></div>
    `;
    await executeFillCommand(adapter, { type: "FILL_PROMPT", modelId: "doubao", prompt: "祖先可见性", autoSubmit: false }, { ...instant, document, hostname: "localhost" });
    expect((document.querySelector("[data-testid='hidden-parent']") as HTMLTextAreaElement).value).toBe("");
    expect(document.querySelector("[contenteditable]")?.textContent).toBe("祖先可见性");
  });

  it("fills a textarea with native events without submitting", async () => {
    document.body.innerHTML = `<textarea data-testid="prompt"></textarea>`;
    const input = document.querySelector("textarea")!;
    const seen: string[] = [];
    input.addEventListener("input", () => seen.push("input"));
    input.addEventListener("change", () => seen.push("change"));
    const result = await executeFillCommand(adapter, { type: "FILL_PROMPT", modelId: "doubao", prompt: "你好🙂", autoSubmit: false }, { ...instant, document, hostname: "localhost" });
    expect(result.status).toBe("FILLED");
    expect(input.value).toBe("你好🙂");
    expect(seen).toEqual(["input", "change"]);
  });

  it("emits framework-detection events so a guarded send button becomes enabled", async () => {
    const qwen = { ...getModelById("qwen"), hostname: "localhost", readyDelayMs: 0 };
    document.body.innerHTML = `<textarea class="message-input-textarea"></textarea>`;
    const input = document.querySelector("textarea")!;
    const seen: string[] = [];
    for (const type of ["beforeinput", "input", "keydown", "keyup"]) {
      input.addEventListener(type, () => seen.push(type));
    }

    await executeFillCommand(
      qwen,
      { type: "FILL_PROMPT", modelId: "qwen", prompt: "检测", autoSubmit: false },
      { ...instant, document, hostname: "localhost" }
    );

    expect(seen).toContain("beforeinput");
    expect(seen).toContain("input");
    expect(seen).toContain("keyup");
    expect(seen.indexOf("beforeinput")).toBeLessThan(seen.indexOf("input"));
  });

  it("emits framework-detection events when filling a contenteditable editor", async () => {
    const qwen = { ...getModelById("qwen"), hostname: "localhost", readyDelayMs: 0 };
    document.body.innerHTML = `<div role="textbox" contenteditable="true"></div>`;
    const input = document.querySelector<HTMLElement>("[contenteditable]")!;
    const seen: string[] = [];
    for (const type of ["beforeinput", "input", "keyup"]) {
      input.addEventListener(type, () => seen.push(type));
    }

    await executeFillCommand(
      qwen,
      { type: "FILL_PROMPT", modelId: "qwen", prompt: "检测", autoSubmit: false },
      { ...instant, document, hostname: "localhost" }
    );

    expect(input.textContent).toBe("检测");
    expect(seen).toContain("beforeinput");
    expect(seen).toContain("input");
    expect(seen).toContain("keyup");
  });

  it("fills contenteditable using textContent and clicks an enabled submit button", async () => {
    document.body.innerHTML = `<div role="textbox" contenteditable="true"></div><button type="submit">发送</button>`;
    const button = document.querySelector("button")!;
    const click = vi.spyOn(button, "click");
    button.addEventListener("click", () => { (document.querySelector("[contenteditable]") as HTMLElement).textContent = ""; });
    const result = await executeFillCommand(adapter, { type: "FILL_PROMPT", modelId: "doubao", prompt: "<b>纯文本</b>", autoSubmit: true }, { ...instant, document, hostname: "localhost" });
    expect(document.querySelector("[contenteditable]")?.textContent).toBe("");
    expect(click).toHaveBeenCalledOnce();
    expect(result.status).toBe("SUBMITTED");
  });

  it("waits for the submit button to become enabled after input", async () => {
    document.body.innerHTML = `<textarea data-testid="prompt"></textarea><button type="submit" disabled>发送</button>`;
    const button = document.querySelector("button")!;
    const click = vi.spyOn(button, "click");
    button.addEventListener("click", () => { (document.querySelector("textarea") as HTMLTextAreaElement).value = ""; });
    const result = await executeFillCommand(adapter, { type: "FILL_PROMPT", modelId: "doubao", prompt: "发射", autoSubmit: true }, {
      ...instant, document, hostname: "localhost",
      sleep: async () => { button.disabled = false; }
    });
    expect(result.status).toBe("SUBMITTED");
    expect(click).toHaveBeenCalledOnce();
  });

  it("clicks the DeepSeek role-button send control instead of the stop control", async () => {
    const deepseek = { ...getModelById("deepseek"), hostname: "localhost", readyDelayMs: 0 };
    document.body.innerHTML = `
      <textarea id="chat-input"></textarea>
      <div role="button" class="ds-icon-button" id="stop"><svg><rect></rect></svg></div>
      <div role="button" class="ds-icon-button" id="send-control"><svg><path></path></svg></div>
    `;
    const stopClick = vi.spyOn(document.querySelector<HTMLElement>("#stop")!, "click");
    const sendClick = vi.spyOn(document.querySelector<HTMLElement>("#send-control")!, "click");
    document.querySelector<HTMLElement>("#send-control")!.addEventListener("click", () => {
      (document.querySelector("#chat-input") as HTMLTextAreaElement).value = "";
    });

    const result = await executeFillCommand(
      deepseek,
      { type: "FILL_PROMPT", modelId: "deepseek", prompt: "发射", autoSubmit: true },
      { ...instant, document, hostname: "localhost" }
    );

    expect(result.status).toBe("SUBMITTED");
    expect(stopClick).not.toHaveBeenCalled();
    expect(sendClick).toHaveBeenCalledOnce();
  });

  it("clicks Qianwen's enabled send control even when its icon contains an SVG rect", async () => {
    const qwen = { ...getModelById("qwen"), hostname: "localhost", readyDelayMs: 0 };
    document.body.innerHTML = `
      <textarea class="message-input-textarea"></textarea>
      <button class="message-input-right-button-send"><svg><rect></rect></svg></button>
    `;
    const button = document.querySelector<HTMLButtonElement>("button")!;
    const click = vi.spyOn(button, "click");
    button.addEventListener("click", () => { (document.querySelector("textarea") as HTMLTextAreaElement).value = ""; });

    const result = await executeFillCommand(
      qwen,
      { type: "FILL_PROMPT", modelId: "qwen", prompt: "请自动发送", autoSubmit: true },
      { ...instant, document, hostname: "localhost" }
    );

    expect(result.status).toBe("SUBMITTED");
    expect(click).toHaveBeenCalledOnce();
  });

  it("uses Qianwen's current data-testid send control", async () => {
    const qwen = { ...getModelById("qwen"), hostname: "localhost", readyDelayMs: 0 };
    document.body.innerHTML = `
      <textarea class="message-input-textarea"></textarea>
      <button data-testid="chat-send-button">发送</button>
    `;
    const click = vi.spyOn(document.querySelector<HTMLButtonElement>("button")!, "click");

    await executeFillCommand(
      qwen,
      { type: "FILL_PROMPT", modelId: "qwen", prompt: "请发送", autoSubmit: true },
      { ...instant, document, hostname: "localhost" }
    );

    expect(click).toHaveBeenCalledOnce();
  });

  it("prefers Qianwen's data-testid send button over a legacy class match", async () => {
    const qwen = { ...getModelById("qwen"), hostname: "localhost", readyDelayMs: 0 };
    document.body.innerHTML = `
      <textarea class="message-input-textarea"></textarea>
      <div class="message-input-right-button-send"></div>
      <button data-testid="chat-send-button">发送</button>
    `;
    const legacyClick = vi.spyOn(document.querySelector<HTMLElement>(".message-input-right-button-send")!, "click");
    const currentClick = vi.spyOn(document.querySelector<HTMLButtonElement>("button")!, "click");

    await executeFillCommand(
      qwen,
      { type: "FILL_PROMPT", modelId: "qwen", prompt: "请发送", autoSubmit: true },
      { ...instant, document, hostname: "localhost" }
    );

    expect(legacyClick).not.toHaveBeenCalled();
    expect(currentClick).toHaveBeenCalledOnce();
  });

  it("replaces Kimi contenteditable text without invoking its insert command twice", async () => {
    const kimi = { ...getModelById("kimi"), hostname: "localhost", readyDelayMs: 0 };
    document.body.innerHTML = `<div role="textbox" contenteditable="true">旧文本</div>`;
    const input = document.querySelector<HTMLElement>("[contenteditable]")!;
    const execCommand = vi.fn(() => true);
    const beforeInput = vi.fn();
    const keydown = vi.fn();
    input.addEventListener("beforeinput", beforeInput);
    input.addEventListener("keydown", keydown);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });

    const result = await executeFillCommand(
      kimi,
      { type: "FILL_PROMPT", modelId: "kimi", prompt: "测试", autoSubmit: false },
      { ...instant, document, hostname: "localhost" }
    );

    expect(result.status).toBe("FILLED");
    expect(input.textContent).toBe("测试");
    expect(execCommand).not.toHaveBeenCalled();
    expect(beforeInput).not.toHaveBeenCalled();
    expect(keydown).not.toHaveBeenCalled();
  });

  it("falls back to Enter when clicking does not consume the filled prompt", async () => {
    document.body.innerHTML = `<textarea data-testid="prompt"></textarea><button type="submit">发送</button>`;
    const input = document.querySelector("textarea")!;
    const enterEvents: string[] = [];
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        enterEvents.push(event.code);
        input.value = "";
      }
    });

    const result = await executeFillCommand(
      adapter,
      { type: "FILL_PROMPT", modelId: "doubao", prompt: "必须发送", autoSubmit: true },
      { ...instant, document, hostname: "localhost" }
    );

    expect(result.status).toBe("SUBMITTED");
    expect(enterEvents).toEqual(["Enter"]);
  });

  it("uses Enter submission when a provider has no discoverable send control", async () => {
    document.body.innerHTML = `<textarea data-testid="prompt"></textarea>`;
    const input = document.querySelector("textarea")!;
    const keydown = vi.fn();
    input.addEventListener("keydown", (event) => {
      keydown(event);
      if (event.key === "Enter") input.value = "";
    });

    const result = await executeFillCommand(
      adapter,
      { type: "FILL_PROMPT", modelId: "doubao", prompt: "键盘发送", autoSubmit: true },
      { ...instant, document, hostname: "localhost", timeoutMs: 500 }
    );

    expect(result.status).toBe("SUBMITTED");
    expect(keydown).toHaveBeenCalledWith(expect.objectContaining({ key: "Enter" }));
  });

  it("reports an unconfirmed submission when the prompt remains after all send attempts", async () => {
    document.body.innerHTML = `<textarea data-testid="prompt"></textarea>`;

    const result = await executeFillCommand(
      adapter,
      { type: "FILL_PROMPT", modelId: "doubao", prompt: "无法确认发送", autoSubmit: true },
      { ...instant, document, hostname: "localhost", timeoutMs: 500 }
    );

    expect(result).toMatchObject({ status: "SUBMIT_NOT_FOUND", detail: "SUBMISSION_UNCONFIRMED" });
  });

  it("reports login, missing input, and missing submit states", async () => {
    document.body.innerHTML = `<div data-testid="login"></div>`;
    expect((await executeFillCommand(adapter, { type: "DIAGNOSE", modelId: "doubao" }, { ...instant, document, hostname: "localhost" })).status).toBe("NOT_LOGGED_IN");
    document.body.innerHTML = "";
    expect((await executeFillCommand(adapter, { type: "DIAGNOSE", modelId: "doubao" }, { ...instant, document, hostname: "localhost", timeoutMs: 500 })).status).toBe("INPUT_NOT_FOUND");
  });

  it("fills ModelAny before diagnosing a send button that starts disabled", async () => {
    document.body.innerHTML = `<textarea data-testid="prompt"></textarea><button type="submit" disabled>发送</button>`;
    const input = document.querySelector<HTMLTextAreaElement>("textarea")!;
    const button = document.querySelector<HTMLButtonElement>("button")!;
    input.addEventListener("input", () => { button.disabled = input.value !== "ModelAny"; });

    const result = await executeFillCommand(
      adapter,
      { type: "DIAGNOSE", modelId: "doubao" },
      { ...instant, document, hostname: "localhost" }
    );

    expect(input.value).toBe("ModelAny");
    expect(result.status).toBe("FILLED");
  });

  it.each([
    ["qwen", `<textarea class="message-input-textarea"></textarea><button data-testid="chat-send-button" aria-disabled="true">发送</button>`],
    ["deepseek", `<textarea id="chat-input"></textarea><div role="button" class="ds-icon-button" aria-disabled="true"><svg><path></path></svg></div>`],
    ["kimi", `<div role="textbox" contenteditable="true"></div><button aria-label="Submit" disabled>发送</button>`],
    ["glm", `<textarea slot="reference"></textarea><button aria-label="发送" disabled>发送</button>`],
    ["wenxin", `<div role="textbox" contenteditable="true"></div><button aria-label="发送" aria-disabled="true">发送</button>`],
    ["chatgpt", `<div id="prompt-textarea" contenteditable="true"></div><button data-testid="send-button" disabled>发送</button>`]
  ] as const)("diagnoses %s by finding its visible send control even while disabled", async (modelId, markup) => {
    const model = { ...getModelById(modelId), hostname: "localhost", readyDelayMs: 0 };
    document.body.innerHTML = markup;

    const result = await executeFillCommand(
      model,
      { type: "DIAGNOSE", modelId },
      { ...instant, document, hostname: "localhost", timeoutMs: 500 }
    );

    expect(result.status).toBe("FILLED");
  });

  it("ignores hidden login controls on an authenticated chat page", async () => {
    document.body.innerHTML = `
      <button data-testid="login" hidden>登录</button>
      <textarea data-testid="prompt"></textarea>
    `;

    const result = await executeFillCommand(
      adapter,
      { type: "FILL_PROMPT", modelId: "doubao", prompt: "已登录", autoSubmit: false },
      { ...instant, document, hostname: "localhost" }
    );

    expect(result.status).toBe("FILLED");
  });

  it("registers one listener and rejects other model messages", async () => {
    let listener: ((message: unknown, sender: unknown, respond: (value: unknown) => void) => boolean) | undefined;
    registerAdapter(getModelById("doubao"), { addListener: (next) => { listener = next; } });
    expect(listener).toBeTypeOf("function");
    expect(listener?.({ type: "FILL_PROMPT", modelId: "glm", prompt: "x", autoSubmit: false }, {}, vi.fn())).toBe(false);
  });
});
