import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { developSeed, inMemoryWorkspaceDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import type { Task } from "@/domain/tasks/task";
import type { LlmClient, LlmReply } from "@/ports/llm-client";
import { runDevelopSubtasks } from "./run-develop-subtasks";

const subtask = (id: string, path: string, overrides: Partial<Task> = {}): Task =>
  buildTask({
    id,
    requestId: "request-1",
    parentTaskId: "parent-1",
    status: "in_progress",
    assignedAgent: "develop",
    files: [path],
    acceptanceCriteria: [`${path} exists`],
    ...overrides,
  });

const replyFor = (path: string, content: string): LlmReply => ({ ok: true, json: { files: [{ path, content }] } });

const answerByFile = (answers: Record<string, LlmReply>): LlmClient => ({
  generateJson: async (prompt: string) => {
    const path = Object.keys(answers).find((candidate) => prompt.includes(`You may write only these files: ${candidate}`));

    return path ? answers[path] : { ok: false, reason: "no scripted answer" };
  },
});

const taskById = async (deps: ReturnType<typeof createInMemoryDependencies>, taskId: string) =>
  (await deps.tasks.list()).find((task) => task.id === taskId);

describe("runDevelopSubtasks", () => {
  it("runs every develop subtask of the parent in turn until each reaches qa", async () => {
    const deps = createInMemoryDependencies({
      ...developSeed,
      tasks: [subtask("subtask-1", "src/a.ts"), subtask("subtask-2", "src/b.ts")],
    });
    const workspace = createInMemoryWorkspaceWriter({});
    const llm = answerByFile({
      "src/a.ts": replyFor("src/a.ts", "export const a = 1;"),
      "src/b.ts": replyFor("src/b.ts", "export const b = 2;"),
    });

    await runDevelopSubtasks({ ...deps, llm, ...inMemoryWorkspaceDependencies(workspace) })("parent-1");

    expect(workspace.files()).toEqual({ "src/a.ts": "export const a = 1;", "src/b.ts": "export const b = 2;" });
    expect((await taskById(deps, "subtask-1"))?.status).toBe("qa");
    expect((await taskById(deps, "subtask-2"))?.status).toBe("qa");
  });

  it("stops without writing when QA is full, leaving the subtask in progress", async () => {
    const qaTasks = [
      buildTask({ id: "qa-1", requestId: "request-1", parentTaskId: "parent-1", status: "qa" }),
      buildTask({ id: "qa-2", requestId: "request-1", parentTaskId: "parent-1", status: "qa" }),
    ];
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask("subtask-1", "src/a.ts"), ...qaTasks] });
    const workspace = createInMemoryWorkspaceWriter({});
    const llm = answerByFile({ "src/a.ts": replyFor("src/a.ts", "export const a = 1;") });

    await runDevelopSubtasks({ ...deps, llm, ...inMemoryWorkspaceDependencies(workspace) })("parent-1");

    expect(workspace.files()).toEqual({});
    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 0]);
  });

  it("keeps retrying a failing subtask until its attempts run out and it goes to review", async () => {
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask("subtask-1", "src/a.ts")] });
    const workspace = createInMemoryWorkspaceWriter({});
    const llm = answerByFile({ "src/a.ts": { ok: true, json: { files: [] } } });

    await runDevelopSubtasks({ ...deps, llm, ...inMemoryWorkspaceDependencies(workspace) })("parent-1");

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts, task?.reviewReason]).toEqual(["review", 3, "attempts"]);
  });
});
