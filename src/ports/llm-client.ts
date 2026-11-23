export type LlmReply = { ok: true; json: unknown } | { ok: false; reason: string };

export type LlmClient = {
  generateJson(prompt: string): Promise<LlmReply>;
};
