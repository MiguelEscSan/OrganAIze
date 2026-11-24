import type { LlmClient } from "@/ports/llm-client";
import { createGeminiLlmClient, type FetchLike } from "../gemini/gemini-llm-client";
import { createOllamaLlmClient } from "../ollama/ollama-llm-client";
import { readLlmConfig } from "./llm-config";

export type LlmClientOutcome = { ok: true; llm: LlmClient } | { ok: false; reason: string };

const defaultOllamaBaseUrl = "http://127.0.0.1:11434";

const ollamaClientFromEnv = (
  env: Record<string, string | undefined>,
  fetcher: FetchLike,
): LlmClientOutcome => {
  const model = env.LLM_MODEL?.trim() ?? "";

  if (model.length === 0) {
    return { ok: false, reason: "LLM_MODEL is not set" };
  }

  const baseUrl = env.OLLAMA_BASE_URL?.trim() || defaultOllamaBaseUrl;

  return { ok: true, llm: createOllamaLlmClient({ baseUrl, model }, fetcher) };
};

export const createLlmClientFromEnv = (
  env: Record<string, string | undefined>,
  fetcher: FetchLike,
): LlmClientOutcome => {
  if (env.LLM_PROVIDER?.trim() === "ollama") {
    return ollamaClientFromEnv(env, fetcher);
  }

  const outcome = readLlmConfig(env);

  if (!outcome.ok) {
    return outcome;
  }

  return { ok: true, llm: createGeminiLlmClient(outcome.config, fetcher) };
};
