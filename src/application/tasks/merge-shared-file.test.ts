import { describe, expect, it } from "vitest";
import type { LlmClient, LlmReply } from "@/ports/llm-client";
import { createRepositoryPromptLibrary } from "@/adapters/in-memory/repository-prompt-library";
import { mergeSharedFile as mergeWith } from "./merge-shared-file";

const mergeSharedFile = (llm: LlmClient, merge: Parameters<typeof mergeWith>[1]) =>
  mergeWith({ llm, prompts: createRepositoryPromptLibrary() }, merge);

const replyingWith = (reply: LlmReply): { llm: LlmClient; prompts: string[] } => {
  const prompts: string[] = [];
  const llm: LlmClient = {
    generateJson: async (prompt) => {
      prompts.push(prompt);
      return reply;
    },
  };

  return { llm, prompts };
};

const input = {
  path: "src/app/page.tsx",
  base: "export default 1;",
  current: "export default 1;\nexport const header = 2;",
  proposed: "export default 3;",
};

describe("merge shared file", () => {
  it("returns the merged content from the merge agent", async () => {
    const { llm } = replyingWith({ ok: true, json: { content: "export default 3;\nexport const header = 2;" } });

    const outcome = await mergeSharedFile(llm, input);

    expect(outcome).toEqual({ ok: true, value: "export default 3;\nexport const header = 2;" });
  });

  it("gives the merge agent the base, the current file and the proposed file", async () => {
    const { llm, prompts } = replyingWith({ ok: true, json: { content: "merged" } });

    await mergeSharedFile(llm, input);

    expect(prompts[0]).toContain(input.base);
    expect(prompts[0]).toContain(input.current);
    expect(prompts[0]).toContain(input.proposed);
  });

  it("fails when the merge reply has no content", async () => {
    const { llm } = replyingWith({ ok: true, json: {} });

    expect(await mergeSharedFile(llm, input)).toEqual({
      ok: false,
      reason: "The merge reply does not match the expected format",
    });
  });

  it("fails when the language model call fails", async () => {
    const { llm } = replyingWith({ ok: false, reason: "Ollama request failed with status 503" });

    expect(await mergeSharedFile(llm, input)).toEqual({ ok: false, reason: "Ollama request failed with status 503" });
  });
});
