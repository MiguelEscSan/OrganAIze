import { describe, expect, it } from "vitest";
import type { LlmClient, LlmProgressListener, LlmReply } from "@/ports/llm-client";
import { streamedLlm } from "./streamed-llm";

const streamingLlm = (lengths: number[]): LlmClient => ({
  generateJson: async (_prompt: string, onProgress?: LlmProgressListener): Promise<LlmReply> => {
    for (const characters of lengths) {
      await onProgress?.({ characters });
    }

    return { ok: true, json: {} };
  },
});

describe("streamedLlm", () => {
  it("reports the characters received as a detail", async () => {
    const reported: string[] = [];
    const llm = streamedLlm(streamingLlm([520]), async (detail) => {
      reported.push(detail);
    });

    await llm.generateJson("write the subtask");

    expect(reported).toEqual(["520 characters"]);
  });

  it("reports once per 500 characters instead of on every piece", async () => {
    const reported: string[] = [];
    const llm = streamedLlm(streamingLlm([10, 80, 499, 500, 740, 1020]), async (detail) => {
      reported.push(detail);
    });

    await llm.generateJson("write the subtask");

    expect(reported).toEqual(["500 characters", "1,020 characters"]);
  });

  it("keeps the context window of the wrapped client", () => {
    const llm = streamedLlm({ ...streamingLlm([]), contextWindowTokens: 8192 }, async () => undefined);

    expect(llm.contextWindowTokens).toBe(8192);
  });

  it("returns the reply the wrapped client produced", async () => {
    const llm = streamedLlm(streamingLlm([]), async () => undefined);

    expect(await llm.generateJson("write the subtask")).toEqual({ ok: true, json: {} });
  });
});
