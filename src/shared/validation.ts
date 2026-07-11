import type { ModelId } from "./types";
import { MODEL_IDS } from "./models";

export const MAX_PROMPT_LENGTH = 5000;
export const countCodePoints = (value: string): number => Array.from(value).length;
export const limitCodePoints = (value: string, max = MAX_PROMPT_LENGTH): string =>
  Array.from(value).slice(0, Math.max(0, max)).join("");
export const normalizePrompt = (value: string): string => {
  const limited = limitCodePoints(value);
  return limited.trim() ? limited : "";
};

export const isModelId = (value: unknown): value is ModelId =>
  typeof value === "string" && MODEL_IDS.includes(value as ModelId);

export const isValidFillMessage = (value: unknown): value is {
  type: "FILL_PROMPT"; modelId: ModelId; prompt: string; autoSubmit: boolean;
} => {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return message.type === "FILL_PROMPT" && isModelId(message.modelId)
    && typeof message.prompt === "string" && Boolean(message.prompt.trim())
    && countCodePoints(message.prompt) <= MAX_PROMPT_LENGTH
    && typeof message.autoSubmit === "boolean";
};
