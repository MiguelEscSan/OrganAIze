export type LlmConfig = {
  apiKey: string;
  model: string;
};

export type LlmConfigOutcome = { ok: true; config: LlmConfig } | { ok: false; reason: string };

export const readLlmConfig = (env: Record<string, string | undefined>): LlmConfigOutcome => {
  const apiKey = env.LLM_API_KEY?.trim() ?? "";
  const model = env.LLM_MODEL?.trim() ?? "";

  if (apiKey.length === 0) {
    return { ok: false, reason: "LLM_API_KEY is not set" };
  }

  if (model.length === 0) {
    return { ok: false, reason: "LLM_MODEL is not set" };
  }

  return { ok: true, config: { apiKey, model } };
};
