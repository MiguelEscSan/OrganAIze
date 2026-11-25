import type { LlmClient, LlmReply } from "@/ports/llm-client";

export type OllamaConfig = {
  baseUrl: string;
  model: string;
};

export type OllamaFetch = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

type OllamaChunk = {
  message?: { content?: unknown };
  done?: unknown;
  prompt_eval_count?: unknown;
  eval_count?: unknown;
};

type StreamedReply = { content: string; tokens: number };

const numberOf = (value: unknown): number => (typeof value === "number" ? value : 0);

const readStream = (text: string): StreamedReply => {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);

  return lines.reduce<StreamedReply>(
    (reply, line) => {
      const chunk = JSON.parse(line) as OllamaChunk;
      const piece = typeof chunk.message?.content === "string" ? chunk.message.content : "";

      return {
        content: reply.content + piece,
        tokens: chunk.done === true ? numberOf(chunk.prompt_eval_count) + numberOf(chunk.eval_count) : reply.tokens,
      };
    },
    { content: "", tokens: 0 },
  );
};

const parseStreamedReply = (text: string): LlmReply => {
  let streamed: StreamedReply;

  try {
    streamed = readStream(text);
  } catch {
    return { ok: false, reason: "Ollama reply is not valid JSON" };
  }

  if (streamed.content.length === 0) {
    return { ok: false, reason: "Ollama reply has no text" };
  }

  try {
    const json: unknown = JSON.parse(streamed.content);

    return { ok: true, json, totalTokens: streamed.tokens };
  } catch {
    return { ok: false, reason: "Ollama reply is not valid JSON" };
  }
};

export const createOllamaLlmClient = (config: OllamaConfig, fetcher: OllamaFetch): LlmClient => ({
  generateJson: async (prompt: string): Promise<LlmReply> => {
    let response: Awaited<ReturnType<OllamaFetch>>;
    let text: string;

    try {
      response = await fetcher(`${config.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          stream: true,
          format: "json",
          options: { num_ctx: 8192 },
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        return { ok: false, reason: `Ollama request failed with status ${response.status}` };
      }

      text = await response.text();
    } catch (error) {
      return { ok: false, reason: `Ollama request failed: ${error instanceof Error ? error.message : String(error)}` };
    }

    return parseStreamedReply(text);
  },
});
