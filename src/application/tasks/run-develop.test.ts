import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { createInMemoryBoardRepository } from "@/adapters/in-memory/in-memory-board-repository";
import { developSeed, inMemoryWorkspaceDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
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
  const deps = createInMemoryDependencies({ ...developSeed, tasks: [task] });
  const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';" });
  const run = runDevelop({ ...deps, ...inMemoryWorkspaceDependencies(workspace), llm: createScriptedLlmClient(llm) });

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

  describe("budgets", () => {
    const START = "2026-11-23T10:00:00.000Z";

    const runWithUsage = (usage: { minutesLater: number; totalTokens?: number }) => {
      const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask()] });
      const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';" });
      const startedMs = Date.parse(START);
      let now = START;
      const llm = {
        generateJson: async () => {
          now = new Date(startedMs + usage.minutesLater * 60_000).toISOString();
          return { ok: true as const, json: validOutput, totalTokens: usage.totalTokens };
        },
      };
      const clock = { now: () => now };
      const run = runDevelop({ ...deps, ...inMemoryWorkspaceDependencies(workspace), clock, llm });

      return { deps, workspace, run };
    };

    it("stops the run when it takes longer than the time budget", async () => {
      const { deps, workspace, run } = runWithUsage({ minutesLater: 16, totalTokens: 100 });

      await run({ kind: "RunDevelop", taskId: "subtask-1" });

      const task = await taskById(deps, "subtask-1");
      expect([task?.status, task?.attempts, task?.reviewReason]).toEqual(["review", 0, "budget"]);
      expect(task?.lastFeedback).toBe("Stopped after 16 min, over the 15 min budget");
      expect(workspace.files()["src/app/page.tsx"]).toBe("export default 'old';");
    });

    it("stops the run when it uses more tokens than the token budget", async () => {
      const { deps, workspace, run } = runWithUsage({ minutesLater: 1, totalTokens: 50_001 });

      await run({ kind: "RunDevelop", taskId: "subtask-1" });

      const task = await taskById(deps, "subtask-1");
      expect([task?.status, task?.attempts, task?.reviewReason]).toEqual(["review", 0, "budget"]);
      expect(task?.lastFeedback).toBe("Stopped after 50001 tokens, over the 50000 token budget");
      expect(workspace.files()["src/app/page.tsx"]).toBe("export default 'old';");
    });

    it("lets the run finish when it stays within both budgets", async () => {
      const { deps, run } = runWithUsage({ minutesLater: 14, totalTokens: 50_000 });

      const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

      expect(outcome.ok).toBe(true);
      expect((await taskById(deps, "subtask-1"))?.status).toBe("qa");
    });
  });

  it("writes nothing and keeps the attempt count when QA is already full", async () => {
    const qaTasks = [
      buildTask({ id: "qa-1", requestId: "request-1", parentTaskId: "parent-1", status: "qa" }),
      buildTask({ id: "qa-2", requestId: "request-1", parentTaskId: "parent-1", status: "qa" }),
    ];
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask(), ...qaTasks] });
    const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';" });
    const run = runDevelop({
      ...deps,
      ...inMemoryWorkspaceDependencies(workspace),
      llm: createScriptedLlmClient({ ok: true, json: validOutput }),
    });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
    expect(workspace.files()).toEqual({ "src/app/page.tsx": "export default 'old';" });
    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 0]);
  });

  it("writes into the root path of the board that owns the subtask's request", async () => {
    const roots: string[] = [];
    const deps = createInMemoryDependencies({
      requests: [{ id: "request-1", boardId: "board-a", title: "Landing", description: "" }],
      tasks: [subtask()],
    });
    const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';" });
    const run = runDevelop({
      ...deps,
      boards: createInMemoryBoardRepository([
        { id: "board-a", name: "A", rootPath: "C:/projects/a" },
        { id: "board-b", name: "B", rootPath: "C:/projects/b" },
      ]),
      workspaceFor: (rootPath) => {
        roots.push(rootPath);
        return workspace;
      },
      llm: createScriptedLlmClient({ ok: true, json: validOutput }),
    });

    await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(roots).toEqual(["C:/projects/a"]);
    expect(workspace.files()["src/app/page.tsx"]).toBe("export default 'new';");
  });

  it("refuses to run a subtask that is not in progress", async () => {
    const { run } = setup(subtask({ status: "ready" }), { ok: true, json: validOutput });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
  });
});

describe("runDevelop prompt", () => {
  it("does not steer the developer toward App.tsx beyond the files of its subtask", async () => {
    const prompts: string[] = [];
    const llm = {
      generateJson: async (prompt: string) => {
        prompts.push(prompt);
        return { ok: true as const, json: validOutput };
      },
    };
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask()] });
    const workspace = createInMemoryWorkspaceWriter({});
    const runWith = runDevelop({ ...deps, ...inMemoryWorkspaceDependencies(workspace), llm });

    await runWith({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(prompts[0]).not.toContain("App.tsx");
  });
});
