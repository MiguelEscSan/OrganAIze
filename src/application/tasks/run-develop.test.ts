import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import type { Task } from "@/domain/tasks/task";
import { runDevelop } from "./run-develop";

const subtask = (overrides: Partial<Task> = {}): Task =>
  buildTask({
    id: "subtask-1",
    requestId: "request-1",
    parentTaskId: "parent-1",
    status: "in_progress",
    assignedAgent: "develop",
    files: ["src/app/page.tsx"],
    acceptanceCriteria: ["Hero shows the headline"],
    ...overrides,
  });

const validOutput = { files: [{ path: "src/app/page.tsx", content: "export default 'new';" }] };

const setup = (task: Task, llm: Parameters<typeof createScriptedLlmClient>[0]) => {
  const deps = createInMemoryDependencies({ tasks: [task] });
  const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';" });
  const run = runDevelop({ ...deps, llm: createScriptedLlmClient(llm), workspace });

  return { deps, workspace, run };
};

const taskById = async (deps: ReturnType<typeof createInMemoryDependencies>, taskId: string) =>
  (await deps.tasks.list()).find((task) => task.id === taskId);

describe("runDevelop", () => {
  it("writes the files and moves the subtask to qa when the output is in scope", async () => {
    const { deps, workspace, run } = setup(subtask(), { ok: true, json: validOutput });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(true);
    expect(workspace.files()["src/app/page.tsx"]).toBe("export default 'new';");
    expect((await taskById(deps, "subtask-1"))?.status).toBe("qa");
  });

  it("refuses output that writes outside the file scope and writes nothing", async () => {
    const output = {
      files: [
        { path: "src/app/page.tsx", content: "changed" },
        { path: "package.json", content: "{}" },
      ],
    };
    const { deps, workspace, run } = setup(subtask(), { ok: true, json: output });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
    expect(workspace.files()).toEqual({ "src/app/page.tsx": "export default 'old';" });
    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toBe("Develop wrote outside its file scope: package.json");
  });

  it("counts invalid output as a failed attempt and keeps the subtask in progress", async () => {
    const { deps, workspace, run } = setup(subtask(), { ok: true, json: { files: [] } });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
    expect(workspace.files()["src/app/page.tsx"]).toBe("export default 'old';");
    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
  });

  it("counts an LLM failure as a failed attempt with its reason", async () => {
    const { deps, run } = setup(subtask(), { ok: false, reason: "Gemini is unavailable" });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome).toEqual({ ok: false, reason: "Gemini is unavailable" });
    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts, task?.lastFeedback]).toEqual([
      "in_progress",
      1,
      "Gemini is unavailable",
    ]);
  });

  it("sends the subtask to review after its third failed attempt", async () => {
    const { deps, run } = setup(subtask({ attempts: 2 }), { ok: true, json: { files: [] } });

    await run({ kind: "RunDevelop", taskId: "subtask-1" });

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts, task?.reviewReason]).toEqual(["review", 3, "attempts"]);
  });

  it("refuses to run a subtask that is not in progress", async () => {
    const { run } = setup(subtask({ status: "ready" }), { ok: true, json: validOutput });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
  });
});
