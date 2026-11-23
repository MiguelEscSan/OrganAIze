import type { LlmClient } from "@/ports/llm-client";
import { createGeminiLlmClient, type FetchLike } from "../gemini/gemini-llm-client";
import { readLlmConfig } from "./llm-config";

export type LlmClientOutcome = { ok: true; llm: LlmClient } | { ok: false; reason: string };

export const createLlmClientFromEnv = (
  env: Record<string, string | undefined>,
  fetcher: FetchLike,
): LlmClientOutcome => {
  const outcome = readLlmConfig(env);

  if (!outcome.ok) {
    return outcome;
  }

  return { ok: true, llm: createGeminiLlmClient(outcome.config, fetcher) };
};
