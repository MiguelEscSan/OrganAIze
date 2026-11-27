import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { inMemoryScaffoldDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import type { WorkspaceWriter } from "@/ports/workspace-writer";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import { orchestrateRequest } from "./orchestrate-request";

const request: Request = { id: "request-1", boardId: "board-1", title: "Landing", description: "A landing page" };
const parentTask: Task = {
  id: "task-1",
  requestId: "request-1",
  parentTaskId: null,
  title: "Landing",
  description: "A landing page",
  acceptanceCriteria: [],
  files: [],
  status: "in_progress",
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,
};

const validPlan = {
  subtasks: [
    {
      title: "Add hero section",
      description: "Render the hero",
      acceptanceCriteria: ["Hero shows the headline"],
      files: ["src/app/page.tsx"],
      runsInParallel: false,
    },
    {
      title: "Add footer",
      description: "Render the footer",
      acceptanceCriteria: ["Footer shows the copyright"],
      files: ["src/app/page.tsx"],
      runsInParallel: false,
    },
  ],
};

const run = (tasks: readonly Task[], llmReply: Parameters<typeof createScriptedLlmClient>[0]) => {
  const workspace = createInMemoryWorkspaceWriter();
  const deps = createInMemoryDependencies({ requests: [request], tasks });
  const orchestrate = orchestrateRequest({
    ...deps,
    ...inMemoryScaffoldDependencies(workspace),
    llm: createScriptedLlmClient(llmReply),
  });

  return { deps, workspace, orchestrate };
};

describe("orchestrateRequest", () => {
  it("creates subtasks in progress under the request task", async () => {
    const { deps, orchestrate } = run([parentTask], { ok: true, json: validPlan });

    const outcome = await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(outcome.ok).toBe(true);
    const subtasks = (await deps.tasks.list()).filter((task) => task.parentTaskId === "task-1");
    expect(subtasks.map((task) => [task.title, task.status, task.requestId, task.assignedAgent])).toEqual([
      ["Add hero section", "in_progress", "request-1", "develop"],
      ["Add footer", "in_progress", "request-1", "develop"],
    ]);
  });

  it("tells the planner the project scaffold already exists and new files must be wired into App.tsx", async () => {
    const prompts: string[] = [];
    const llm = {
      generateJson: async (prompt: string) => {
        prompts.push(prompt);
        return { ok: true as const, json: validPlan };
      },
    };
    const workspace = createInMemoryWorkspaceWriter();
    const deps = createInMemoryDependencies({ requests: [request], tasks: [parentTask] });
    const orchestrate = orchestrateRequest({
      ...deps,
      ...inMemoryScaffoldDependencies(workspace),
      llm,
    });

    await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(prompts[0]).toContain("already exists");
    expect(prompts[0]).toContain("package.json, tsconfig.json, vite.config.ts, index.html, main entry");
    expect(prompts[0]).toContain("adds the import to App.tsx or to a file that App.tsx imports");
    expect(prompts[0]).not.toContain("the first subtask creates it");
    expect(prompts[0]).not.toContain("when it does not exist yet");
  });

  it("writes the project scaffold before splitting the request", async () => {
    const { workspace, orchestrate } = run([parentTask], { ok: true, json: validPlan });

    await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(Object.keys(workspace.files())).toContain("package.json");
    expect(Object.keys(workspace.files())).toContain("App.tsx");
  });

  it("does not touch a project that already has a package.json", async () => {
    const workspace = createInMemoryWorkspaceWriter({ "package.json": "{}" });
    const deps = createInMemoryDependencies({ requests: [request], tasks: [parentTask] });
    const orchestrate = orchestrateRequest({
      ...deps,
      ...inMemoryScaffoldDependencies(workspace),
      llm: createScriptedLlmClient({ ok: true, json: validPlan }),
    });

    await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(workspace.files()).toEqual({ "package.json": "{}" });
  });

  it("fails with the scaffold reason and creates no subtasks when the scaffold cannot be written", async () => {
    const workspace = createInMemoryWorkspaceWriter();
    const brokenWriter: WorkspaceWriter = {
      read: workspace.read,
      write: async () => {
        throw new Error("disk is read-only");
      },
    };
    const deps = createInMemoryDependencies({ requests: [request], tasks: [parentTask] });
    const orchestrate = orchestrateRequest({
      ...deps,
      ...inMemoryScaffoldDependencies(workspace),
      workspaceFor: () => brokenWriter,
      llm: createScriptedLlmClient({ ok: true, json: validPlan }),
    });

    const outcome = await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(outcome).toEqual({ ok: false, reason: "The project scaffold could not be written: disk is read-only" });
    expect((await deps.tasks.list()).map((task) => task.id)).toEqual(["task-1"]);
  });

  it("stores each subtask's acceptance criteria and files", async () => {
    const { deps, orchestrate } = run([parentTask], { ok: true, json: validPlan });

    await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    const subtasks = (await deps.tasks.list()).filter((task) => task.parentTaskId === "task-1");
    expect(subtasks.map((task) => [task.acceptanceCriteria, task.files])).toEqual([
      [["Hero shows the headline"], ["src/app/page.tsx"]],
      [["Footer shows the copyright"], ["src/app/page.tsx"]],
    ]);
  });

  it("records an event for every subtask it creates", async () => {
    const { deps, orchestrate } = run([parentTask], { ok: true, json: validPlan });

    await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect((await deps.events.list()).map((event) => event.reason)).toEqual([
      "Created from task-1 by the orchestrator",
      "Created from task-1 by the orchestrator",
    ]);
  });

  it("refuses a task that is not in progress and creates nothing", async () => {
    const readyTask: Task = { ...parentTask, status: "ready" };
    const { deps, orchestrate } = run([readyTask], { ok: true, json: validPlan });

    const outcome = await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(outcome).toEqual({ ok: false, reason: "Only a request task in progress can be split" });
    expect(await deps.tasks.list()).toEqual([readyTask]);
  });

  it("refuses a request that was already split", async () => {
    const existingSubtask: Task = { ...parentTask, id: "task-2", parentTaskId: "task-1", title: "Old" };
    const { deps, orchestrate } = run([parentTask, existingSubtask], { ok: true, json: validPlan });

    const outcome = await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(outcome).toEqual({ ok: false, reason: "This request was already split" });
    expect((await deps.tasks.list()).map((task) => task.id)).toEqual(["task-1", "task-2"]);
  });

  it("refuses an invalid plan, creates nothing and counts a failed attempt", async () => {
    const { deps, orchestrate } = run([parentTask], { ok: true, json: { subtasks: [] } });

    const outcome = await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(outcome.ok).toBe(false);
    const [parent] = await deps.tasks.list();
    expect([parent.id, parent.attempts, parent.status]).toEqual(["task-1", 1, "in_progress"]);
    expect((await deps.events.list()).map((event) => event.to)).toEqual(["in_progress"]);
  });

  it("keeps the request in progress after its third invalid plan", async () => {
    const thirdAttempt: Task = { ...parentTask, attempts: 2 };
    const { deps, orchestrate } = run([thirdAttempt], { ok: true, json: { subtasks: [] } });

    await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    const [parent] = await deps.tasks.list();
    expect([parent.status, parent.attempts, parent.reviewReason]).toEqual(["in_progress", 3, null]);
  });

  it("moves the request to review after its sixth invalid plan", async () => {
    const sixthAttempt: Task = { ...parentTask, attempts: 5 };
    const { deps, orchestrate } = run([sixthAttempt], { ok: true, json: { subtasks: [] } });

    await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    const [parent] = await deps.tasks.list();
    expect([parent.status, parent.attempts, parent.reviewReason]).toEqual(["review", 6, "attempts"]);
  });

  it("refuses when the LLM call fails and creates nothing", async () => {
    const { deps, orchestrate } = run([parentTask], { ok: false, reason: "Gemini is unavailable" });

    const outcome = await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(outcome).toEqual({ ok: false, reason: "Gemini is unavailable" });
    expect((await deps.tasks.list()).map((task) => task.id)).toEqual(["task-1"]);
  });
});

describe("orchestrateRequest live steps", () => {
  it("announces the scaffold and the split, then clears the status", async () => {
    const statuses: (string | null)[] = [];
    const deps = createInMemoryDependencies({ requests: [request], tasks: [parentTask] });
    const tasks = {
      ...deps.tasks,
      setLiveStatus: async (taskId: string, liveStatus: string | null) => {
        statuses.push(liveStatus);
        await deps.tasks.setLiveStatus(taskId, liveStatus);
      },
    };
    const orchestrate = orchestrateRequest({
      ...deps,
      tasks,
      ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter()),
      llm: createScriptedLlmClient({ ok: true, json: validPlan }),
    });

    await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(statuses).toEqual(["Writing the project scaffold", 'Splitting "Landing" into subtasks', null]);
  });
});
