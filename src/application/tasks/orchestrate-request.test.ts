import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
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
  const deps = createInMemoryDependencies({ requests: [request], tasks });
  const orchestrate = orchestrateRequest({ ...deps, llm: createScriptedLlmClient(llmReply) });

  return { deps, orchestrate };
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

  it("refuses an invalid plan and creates nothing", async () => {
    const { deps, orchestrate } = run([parentTask], { ok: true, json: { subtasks: [] } });

    const outcome = await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(outcome.ok).toBe(false);
    expect((await deps.tasks.list()).map((task) => task.id)).toEqual(["task-1"]);
  });

  it("refuses when the LLM call fails and creates nothing", async () => {
    const { deps, orchestrate } = run([parentTask], { ok: false, reason: "Gemini is unavailable" });

    const outcome = await orchestrate({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(outcome).toEqual({ ok: false, reason: "Gemini is unavailable" });
    expect((await deps.tasks.list()).map((task) => task.id)).toEqual(["task-1"]);
  });
});
