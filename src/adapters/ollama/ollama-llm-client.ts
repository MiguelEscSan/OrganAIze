import type { LlmClient, LlmReply } from "@/ports/llm-client";

export type OllamaConfig = {
  baseUrl: string;
  model: string;
};

export type OllamaFetch = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

type OllamaChatBody = {
  message?: { content?: unknown };
  prompt_eval_count?: unknown;
  eval_count?: unknown;
};

const numberOf = (value: unknown): number => (typeof value === "number" ? value : 0);

const parseReply = (body: OllamaChatBody): LlmReply => {
  if (typeof body.message?.content !== "string") {
    return { ok: false, reason: "Ollama reply has no text" };
  }

  try {
    const json: unknown = JSON.parse(body.message.content);

    return { ok: true, json, totalTokens: numberOf(body.prompt_eval_count) + numberOf(body.eval_count) };
  } catch {
    return { ok: false, reason: "Ollama reply is not valid JSON" };
  }
};

export const createOllamaLlmClient = (config: OllamaConfig, fetcher: OllamaFetch): LlmClient => ({
  generateJson: async (prompt: string): Promise<LlmReply> => {
    let response: Awaited<ReturnType<OllamaFetch>>;

    try {
      response = await fetcher(`${config.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          stream: false,
          format: "json",
          options: { num_ctx: 8192 },
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (error) {
      return { ok: false, reason: `Ollama request failed: ${error instanceof Error ? error.message : String(error)}` };
    }

    if (!response.ok) {
      return { ok: false, reason: `Ollama request failed with status ${response.status}` };
    }

    return parseReply((await response.json()) as OllamaChatBody);
  },
});
