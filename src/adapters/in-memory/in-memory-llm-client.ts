import type { LlmClient, LlmReply } from "@/ports/llm-client";

export const createScriptedLlmClient = (reply: LlmReply): LlmClient => ({
  generateJson: async () => reply,
});
