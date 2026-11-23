export type LlmReply =
  | { ok: true; json: unknown; totalTokens?: number }
  | { ok: false; reason: string };

export type LlmClient = {
  generateJson(prompt: string): Promise<LlmReply>;
};
