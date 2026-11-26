export type LlmReply =
  | { ok: true; json: unknown; totalTokens?: number }
  | { ok: false; reason: string; unavailable?: true };

export type LlmProgress = { characters: number };

export type LlmProgressListener = (progress: LlmProgress) => Promise<void>;

export type LlmClient = {
  contextWindowTokens?: number;
  generateJson(prompt: string, onProgress?: LlmProgressListener): Promise<LlmReply>;
};
