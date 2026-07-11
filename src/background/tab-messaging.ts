import type { ModelResultCode } from "../shared/types";

interface RetryDependencies<TMessage, TResult> {
  send(tabId: number, message: TMessage): Promise<TResult>;
  sleep(milliseconds: number): Promise<void>;
  now(): number;
}

export class DeliveryError extends Error {
  constructor(public readonly code: ModelResultCode, message: string) {
    super(message);
    this.name = "DeliveryError";
  }
}

const connectionPending = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /Receiving end does not exist|Could not establish connection/i.test(message);
};

export const sendMessageWithRetry = async <TMessage, TResult>(
  tabId: number,
  message: TMessage,
  dependencies: RetryDependencies<TMessage, TResult>,
  deadline: number
): Promise<TResult> => {
  let delay = 250;
  while (dependencies.now() < deadline) {
    try {
      return await dependencies.send(tabId, message);
    } catch (error) {
      if (!connectionPending(error)) throw error;
      const remaining = deadline - dependencies.now();
      if (remaining <= 0) break;
      await dependencies.sleep(Math.min(delay, remaining));
      delay = Math.min(delay * 2, 1_000);
    }
  }
  throw new DeliveryError("PAGE_TIMEOUT", "Content script connection timed out");
};

export const classifyDeliveryError = async (
  error: unknown,
  tabId: number | undefined,
  tabExists: (tabId: number) => Promise<boolean>
): Promise<ModelResultCode> => {
  if (tabId !== undefined && !await tabExists(tabId)) return "TAB_CLOSED";
  if (error instanceof DeliveryError && (error.code === "PAGE_TIMEOUT" || error.code === "TAB_CLOSED")) return error.code;
  if (typeof error === "object" && error !== null && "code" in error && error.code === "PAGE_TIMEOUT") return "PAGE_TIMEOUT";
  if (error instanceof Error && error.message === "PAGE_TIMEOUT") return "PAGE_TIMEOUT";
  return "UNEXPECTED_ERROR";
};
