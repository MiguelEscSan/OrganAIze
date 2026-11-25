import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { developSeed, inMemoryDevelopDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import type { LlmClient } from "@/ports/llm-client";
import { runDevelopSubtasks } from "./run-develop-subtasks";

const writtenPathOf = (prompt: string): string => prompt.match(/You may write only these files: ([^\n]+)/)?.[1] ?? "";

const subtaskOf = (id: string, file: string, runsInParallel: boolean) =>
  buildTask({
    id,
    requestId: "request-1",
    parentTaskId: "parent-1",
    title: id,
    status: "in_progress",
    assignedAgent: "develop",
    files: [file],
    runsInParallel,
  });

const trackingLlm = (): { llm: LlmClient; peakConcurrentCalls: () => number } => {
  let active = 0;
  let peak = 0;

  const llm: LlmClient = {
    generateJson: async (prompt) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active -= 1;

      return { ok: true, json: { files: [{ path: writtenPathOf(prompt), content: "export {};" }] } };
    },
  };

  return { llm, peakConcurrentCalls: () => peak };
};

const runWith = async (subtasks: ReturnType<typeof subtaskOf>[]) => {
  const deps = createInMemoryDependencies({ ...developSeed, tasks: subtasks });
  const tracking = trackingLlm();
  const writer = createInMemoryWorkspaceWriter({});

  await runDevelopSubtasks({ ...deps, ...inMemoryDevelopDependencies(writer), llm: tracking.llm })("parent-1");

  return { deps, peak: tracking.peakConcurrentCalls() };
};

describe("run develop subtasks", () => {
  it("runs subtasks planned as parallel at the same time", async () => {
    const { peak } = await runWith([
      subtaskOf("subtask-a", "src/a.ts", true),
      subtaskOf("subtask-b", "src/b.ts", true),
    ]);

    expect(peak).toBe(2);
  });

  it("runs subtasks planned in sequence one at a time", async () => {
    const { peak } = await runWith([
      subtaskOf("subtask-a", "src/a.ts", false),
      subtaskOf("subtask-b", "src/b.ts", false),
    ]);

    expect(peak).toBe(1);
  });
});
