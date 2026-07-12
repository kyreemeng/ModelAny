import { MODEL_IDS } from "../shared/models";
import type { ModelId } from "../shared/types";
import { countCodePoints, MAX_PROMPT_LENGTH, normalizePrompt } from "../shared/validation";

export const WEBSITE_ORIGIN = "https://modelany.app";

export interface WebsiteLaunchRequest {
  prompt: string;
  modelIds: ModelId[];
  autoSubmit: boolean;
}

const hasValidNonce = (value: unknown): value is string =>
  typeof value === "string" && value.length >= 8 && value.length <= 128;

export const parseWebsiteLaunchRequest = (value: unknown): WebsiteLaunchRequest | undefined => {
  if (!value || typeof value !== "object") return;
  const message = value as Record<string, unknown>;
  const payload = message.payload;
  if (message.type !== "MODELANY_LAUNCH_REQUEST" || !hasValidNonce(message.nonce) || !payload || typeof payload !== "object") return;

  const input = payload as Record<string, unknown>;
  if (typeof input.prompt !== "string" || countCodePoints(input.prompt) > MAX_PROMPT_LENGTH || typeof input.autoSubmit !== "boolean") return;
  if (!Array.isArray(input.modelIds) || input.modelIds.length === 0 || input.modelIds.length > MODEL_IDS.length) return;

  const modelIds = [...new Set(input.modelIds)].filter((id): id is ModelId =>
    typeof id === "string" && MODEL_IDS.includes(id as ModelId),
  );
  if (modelIds.length !== input.modelIds.length) return;

  const prompt = normalizePrompt(input.prompt);
  return prompt ? { prompt, modelIds, autoSubmit: input.autoSubmit } : undefined;
};
