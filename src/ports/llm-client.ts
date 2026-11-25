export type LlmReply =
  | { ok: true; json: unknown; totalTokens?: number }
  | { ok: false; reason: string };

export type LlmProgress = { characters: number };

export type LlmProgressListener = (progress: LlmProgress) => Promise<void>;

export type LlmClient = {
  generateJson(prompt: string, onProgress?: LlmProgressListener): Promise<LlmReply>;
};
