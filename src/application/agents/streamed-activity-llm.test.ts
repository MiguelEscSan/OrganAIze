import { describe, expect, it } from "vitest";
import { createInMemoryAgentActivityRepository } from "@/adapters/in-memory/in-memory-agent-activity-repository";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { LlmClient, LlmProgressListener, LlmReply } from "@/ports/llm-client";
import { streamedActivityLlm } from "./streamed-activity-llm";

const working: AgentActivityRecord = { agent: "develop", state: "working", message: 'Writing "Login"' };

const streamingLlm = (lengths: number[]): LlmClient => ({
  generateJson: async (_prompt: string, onProgress?: LlmProgressListener): Promise<LlmReply> => {
    for (const characters of lengths) {
      await onProgress?.({ characters });
    }

    return { ok: true, json: {} };
  },
});

describe("streamedActivityLlm", () => {
  it("records the characters received as the working message", async () => {
    const activity = createInMemoryAgentActivityRepository();
    const llm = streamedActivityLlm(streamingLlm([520]), activity, working);

    await llm.generateJson("write the subtask");

    expect(await activity.list()).toEqual([
      { agent: "develop", state: "working", message: 'Writing "Login" · 520 characters' },
    ]);
  });

  it("records once per 500 characters instead of on every piece", async () => {
    const activity = createInMemoryAgentActivityRepository();
    const recorded: string[] = [];
    const watched = {
      ...activity,
      record: async (record: AgentActivityRecord) => {
        recorded.push(record.message);
        await activity.record(record);
      },
    };
    const llm = streamedActivityLlm(streamingLlm([10, 80, 499, 500, 740, 1020]), watched, working);

    await llm.generateJson("write the subtask");

    expect(recorded).toEqual([
      'Writing "Login" · 500 characters',
      'Writing "Login" · 1,020 characters',
    ]);
  });

  it("returns the reply the wrapped client produced", async () => {
    const activity = createInMemoryAgentActivityRepository();
    const llm = streamedActivityLlm(streamingLlm([]), activity, working);

    expect(await llm.generateJson("write the subtask")).toEqual({ ok: true, json: {} });
  });
});
