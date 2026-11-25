import type { LlmClient, LlmProgressListener, LlmReply } from "@/ports/llm-client";

export type OllamaConfig = {
  baseUrl: string;
  model: string;
};

export type OllamaFetch = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string },
) => Promise<Response>;

type OllamaChunk = {
  message?: { content?: unknown };
  done?: unknown;
  prompt_eval_count?: unknown;
  eval_count?: unknown;
};

type StreamedReply = { content: string; tokens: number };

const emptyReply: StreamedReply = { content: "", tokens: 0 };

const numberOf = (value: unknown): number => (typeof value === "number" ? value : 0);

const applyLine = (reply: StreamedReply, line: string): StreamedReply => {
  const chunk = JSON.parse(line) as OllamaChunk;
  const piece = typeof chunk.message?.content === "string" ? chunk.message.content : "";

  return {
    content: reply.content + piece,
    tokens:
      chunk.done === true ? numberOf(chunk.prompt_eval_count) + numberOf(chunk.eval_count) : reply.tokens,
  };
};

const readStream = async (body: ReadableStream<Uint8Array>, onProgress?: LlmProgressListener): Promise<StreamedReply> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  let reply = emptyReply;

  const consume = async (line: string): Promise<void> => {
    if (line.trim().length === 0) {
      return;
    }

    const previousLength = reply.content.length;
    reply = applyLine(reply, line);

    if (onProgress && reply.content.length !== previousLength) {
      await onProgress({ characters: reply.content.length });
    }
  };

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      buffered += decoder.decode();
      break;
    }

    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      await consume(line);
    }
  }

  await consume(buffered);

  return reply;
};

const toLlmReply = (streamed: StreamedReply): LlmReply => {
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
  generateJson: async (prompt: string, onProgress?: LlmProgressListener): Promise<LlmReply> => {
    let streamed: StreamedReply;

    try {
      const response = await fetcher(`${config.baseUrl}/api/chat`, {
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
        return { ok: false, reason: `Ollama request failed with status ${response.status}`, unavailable: true };
      }

      if (!response.body) {
        return { ok: false, reason: "Ollama reply has no text" };
      }

      streamed = await readStream(response.body, onProgress);
    } catch (error) {
      return {
        ok: false,
        reason: `Ollama request failed: ${error instanceof Error ? error.message : String(error)}`,
        unavailable: true,
      };
    }

    return toLlmReply(streamed);
  },
});
