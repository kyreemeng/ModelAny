import type { ModelAdapter } from "../shared/models";
import type { ModelId, ModelResultCode } from "../shared/types";
import { isAllowedModelHost } from "../shared/models";
import { isValidFillMessage } from "../shared/validation";

type Command = { type: "FILL_PROMPT"; modelId: ModelId; prompt: string; autoSubmit: boolean }
  | { type: "DIAGNOSE"; modelId: ModelId };
export interface EngineResult { status: ModelResultCode; detail?: string }
interface EngineDependencies {
  document: Document;
  hostname: string;
  sleep: (milliseconds: number) => Promise<void>;
  now: () => number;
  timeoutMs?: number;
}

const defaults = (): EngineDependencies => ({
  document, hostname: location.hostname,
  sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  now: () => Date.now()
});

const firstMatch = <T extends Element>(root: Document, selectors: readonly string[]): T | null => {
  for (const selector of selectors) {
    const element = root.querySelector<T>(selector);
    if (element) return element;
  }
  return null;
};

const firstVisibleMatch = (root: Document, selectors: readonly string[]): Element | null => {
  for (const selector of selectors) {
    for (const element of root.querySelectorAll(selector)) {
      const htmlElement = element as HTMLElement;
      const style = htmlElement.style;
      if (!htmlElement.hidden && htmlElement.getAttribute("aria-hidden") !== "true"
        && style.display !== "none" && style.visibility !== "hidden") {
        return element;
      }
    }
  }
  return null;
};

const visible = (element: HTMLElement): boolean => {
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (current.hidden || current.getAttribute("aria-hidden") === "true" || style?.display === "none"
      || style?.visibility === "hidden" || style?.visibility === "collapse" || style?.opacity === "0") return false;
  }
  return true;
};

const editable = (element: Element): element is HTMLElement => {
  if (!(element instanceof HTMLElement) || !visible(element)) return false;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly;
  return element.isContentEditable || element.getAttribute("contenteditable") === "true";
};

export const waitForEditable = async (
  adapter: ModelAdapter, dependencies: EngineDependencies
): Promise<HTMLElement | null> => {
  const deadline = dependencies.now() + (dependencies.timeoutMs ?? 10_000);
  while (dependencies.now() <= deadline) {
    for (const selector of adapter.inputSelectors) {
      for (const candidate of dependencies.document.querySelectorAll(selector)) {
        if (editable(candidate)) return candidate;
      }
    }
    await dependencies.sleep(500);
  }
  return null;
};

const dispatchBeforeInput = (element: HTMLElement, value: string): void => {
  element.dispatchEvent(new InputEvent("beforeinput", {
    bubbles: true, cancelable: true, composed: true, inputType: "insertText", data: value
  }));
};

const dispatchTypingSignal = (element: HTMLElement, value: string): void => {
  const key = value.length > 0 ? Array.from(value).slice(-1)[0]! : "";
  const init: KeyboardEventInit = { key, bubbles: true, cancelable: true, composed: true };
  element.dispatchEvent(new KeyboardEvent("keydown", init));
  element.dispatchEvent(new KeyboardEvent("keyup", init));
};

export const setNativeValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string): void => {
  element.focus();
  dispatchBeforeInput(element, value);
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new InputEvent("input", {
    bubbles: true, composed: true, inputType: "insertText", data: value
  }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  dispatchTypingSignal(element, value);
};

export const fillContentEditable = (element: HTMLElement, value: string): void => {
  element.focus();
  const selection = element.ownerDocument.getSelection();
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
  dispatchBeforeInput(element, value);
  const inserted = element.ownerDocument.execCommand?.("insertText", false, value) ?? false;
  if (!inserted || element.textContent !== value) element.textContent = value;
  element.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType: "insertText", data: value }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  dispatchTypingSignal(element, value);
};

const replaceContentEditable = (element: HTMLElement, value: string): void => {
  element.focus();
  element.replaceChildren(element.ownerDocument.createTextNode(value));
  element.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType: "insertText", data: value }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const dispatchEnter = (input: HTMLElement): void => {
  input.focus();
  const init: KeyboardEventInit = {
    key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true
  };
  input.dispatchEvent(new KeyboardEvent("keydown", init));
  input.dispatchEvent(new KeyboardEvent("keypress", init));
  input.dispatchEvent(new KeyboardEvent("keyup", init));
};

const promptRemains = (input: HTMLElement, prompt: string): boolean => {
  const value = input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
    ? input.value
    : input.textContent ?? "";
  return value.trim() === prompt.trim();
};

const fillPrompt = (adapter: ModelAdapter, input: HTMLElement, prompt: string): void => {
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) setNativeValue(input, prompt);
  else if (adapter.id === "kimi") replaceContentEditable(input, prompt);
  else fillContentEditable(input, prompt);
};

const clickSubmitControl = (control: HTMLElement): void => {
  control.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
  control.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  control.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
  control.click();
};

const visibleSubmitControl = (adapter: ModelAdapter, element: Element): element is HTMLElement => {
  if (!(element instanceof HTMLElement) || !visible(element)) return false;
  if (element.matches("[data-testid*='stop'], [aria-label*='停止'], [aria-label*='Stop']")) return false;
  return adapter.id !== "deepseek" || !element.querySelector("svg rect");
};

const usableSubmitControl = (adapter: ModelAdapter, element: Element): element is HTMLElement => {
  if (!visibleSubmitControl(adapter, element)) return false;
  if (element instanceof HTMLButtonElement && element.disabled) return false;
  return element.getAttribute("aria-disabled") !== "true";
};

const findSubmitControl = (
  adapter: ModelAdapter,
  root: Document,
  predicate: (adapter: ModelAdapter, element: Element) => element is HTMLElement
): HTMLElement | null => {
  for (const selector of adapter.submitSelectors) {
    for (const control of root.querySelectorAll(selector)) {
      if (predicate(adapter, control)) return control;
    }
  }
  return null;
};

export const findSubmitButton = (adapter: ModelAdapter, root: Document): HTMLElement | null => {
  return findSubmitControl(adapter, root, usableSubmitControl);
};

const waitForSubmitButton = async (
  adapter: ModelAdapter,
  dependencies: EngineDependencies,
  predicate = usableSubmitControl
): Promise<HTMLElement | null> => {
  const deadline = dependencies.now() + Math.min(dependencies.timeoutMs ?? 5_000, 5_000);
  while (dependencies.now() <= deadline) {
    const button = findSubmitControl(adapter, dependencies.document, predicate);
    if (button) return button;
    await dependencies.sleep(500);
  }
  return null;
};

const onLoginPage = (adapter: ModelAdapter, dependencies: EngineDependencies): boolean =>
  adapter.loginPathHints.some((hint) => dependencies.document.location.pathname.includes(hint))
  || Boolean(firstVisibleMatch(dependencies.document, adapter.loginSelectors));

export const executeFillCommand = async (
  adapter: ModelAdapter, command: Command, partial: Partial<EngineDependencies> = {}
): Promise<EngineResult> => {
  const dependencies = { ...defaults(), ...partial };
  if (dependencies.hostname !== adapter.hostname && !isAllowedModelHost(adapter.id, dependencies.hostname)) {
    return { status: "UNEXPECTED_ERROR", detail: "HOST_MISMATCH" };
  }
  if (command.modelId !== adapter.id) return { status: "UNEXPECTED_ERROR", detail: "MODEL_MISMATCH" };
  if (onLoginPage(adapter, dependencies)) return { status: "NOT_LOGGED_IN" };
  if (adapter.readyDelayMs > 0) await dependencies.sleep(adapter.readyDelayMs);
  const input = await waitForEditable(adapter, dependencies);
  if (!input) return { status: "INPUT_NOT_FOUND" };
  if (command.type === "DIAGNOSE") {
    fillPrompt(adapter, input, "ModelAny");
    const diagnosticButton = await waitForSubmitButton(adapter, dependencies, visibleSubmitControl);
    return { status: diagnosticButton ? "FILLED" : "SUBMIT_NOT_FOUND" };
  }
  if (!isValidFillMessage(command)) return { status: "UNEXPECTED_ERROR", detail: "INVALID_MESSAGE" };
  fillPrompt(adapter, input, command.prompt);
  if (!command.autoSubmit) return { status: "FILLED" };
  const button = await waitForSubmitButton(adapter, dependencies);
  if (button) {
    clickSubmitControl(button);
    await dependencies.sleep(700);
  }
  if (!button || promptRemains(input, command.prompt)) {
    dispatchEnter(input);
    await dependencies.sleep(200);
  }
  return promptRemains(input, command.prompt)
    ? { status: "SUBMIT_NOT_FOUND", detail: "SUBMISSION_UNCONFIRMED" }
    : { status: "SUBMITTED" };
};

interface MessageEventLike {
  addListener(listener: (message: unknown, sender: unknown, sendResponse: (response: EngineResult) => void) => boolean): void;
}

export const registerAdapter = (
  adapter: ModelAdapter,
  event: MessageEventLike = chrome.runtime.onMessage
): void => {
  event.addListener((message, _sender, sendResponse) => {
    const command = message as Partial<Command>;
    if ((command.type !== "FILL_PROMPT" && command.type !== "DIAGNOSE") || command.modelId !== adapter.id) return false;
    void executeFillCommand(adapter, command as Command).then(sendResponse);
    return true;
  });
};
