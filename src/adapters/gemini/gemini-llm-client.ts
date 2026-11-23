import type { LlmClient, LlmReply } from "@/ports/llm-client";

export type GeminiConfig = {
  apiKey: string;
  model: string;
};

export type FetchLike = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const endpointFor = (model: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const textOf = (body: unknown): string | undefined => {
  const candidates = (body as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] }).candidates;
  const text = candidates?.[0]?.content?.parts?.[0]?.text;

  return typeof text === "string" ? text : undefined;
};

const totalTokensOf = (body: unknown): number | undefined => {
  const total = (body as { usageMetadata?: { totalTokenCount?: unknown } }).usageMetadata?.totalTokenCount;

  return typeof total === "number" ? total : undefined;
};

const parseJson = (text: string, totalTokens: number | undefined): LlmReply => {
  try {
    const json: unknown = JSON.parse(text);

    return totalTokens === undefined ? { ok: true, json } : { ok: true, json, totalTokens };
  } catch {
    return { ok: false, reason: "Gemini reply is not valid JSON" };
  }
};

export const createGeminiLlmClient = (config: GeminiConfig, fetcher: FetchLike): LlmClient => ({
  generateJson: async (prompt: string): Promise<LlmReply> => {
    const response = await fetcher(endpointFor(config.model), {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": config.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) {
      return { ok: false, reason: `Gemini request failed with status ${response.status}` };
    }

    const body = await response.json();
    const text = textOf(body);

    if (text === undefined) {
      return { ok: false, reason: "Gemini reply has no text" };
    }

    return parseJson(text, totalTokensOf(body));
  },
});
