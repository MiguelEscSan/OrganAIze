import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import { claimAndOrchestrateRequest } from "./claim-and-orchestrate-request";

const request: Request = { id: "request-1", boardId: "board-1", title: "Landing", description: "A landing page" };
const readyTask: Task = {
  id: "task-1",
  requestId: "request-1",
  parentTaskId: null,
  title: "Landing",
  description: "A landing page",
  status: "ready",
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
  ],
};

describe("claimAndOrchestrateRequest", () => {
  it("claims the next ready request and splits it into subtasks", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [readyTask] });
    const claimAndOrchestrate = claimAndOrchestrateRequest({
      ...deps,
      llm: createScriptedLlmClient({ ok: true, json: validPlan }),
    });

    const outcome = await claimAndOrchestrate();

    expect(outcome.ok).toBe(true);
    const tasks = await deps.tasks.list();
    expect(tasks.find((task) => task.id === "task-1")?.status).toBe("in_progress");
    expect(tasks.filter((task) => task.parentTaskId === "task-1").map((task) => task.title)).toEqual([
      "Add hero section",
    ]);
  });

  it("sends the request to review with the reason when the LLM call fails", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [readyTask] });
    const claimAndOrchestrate = claimAndOrchestrateRequest({
      ...deps,
      llm: createScriptedLlmClient({ ok: false, reason: "Gemini is unavailable" }),
    });

    const outcome = await claimAndOrchestrate();

    expect(outcome).toEqual({ ok: false, reason: "Gemini is unavailable" });
    const [task] = await deps.tasks.list();
    expect([task.status, task.reviewReason, task.lastFeedback]).toEqual([
      "review",
      "orchestration",
      "Gemini is unavailable",
    ]);
  });

  it("sends the request to review with a fallback reason when the failure has no text", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [readyTask] });
    const claimAndOrchestrate = claimAndOrchestrateRequest({
      ...deps,
      llm: createScriptedLlmClient({ ok: false, reason: "   " }),
    });

    const outcome = await claimAndOrchestrate();

    expect(outcome).toEqual({ ok: false, reason: "Orchestration failed without a reason" });
    const [task] = await deps.tasks.list();
    expect([task.status, task.reviewReason, task.lastFeedback]).toEqual([
      "review",
      "orchestration",
      "Orchestration failed without a reason",
    ]);
  });

  it("retries an invalid plan and sends the request to review after three attempts", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [readyTask] });
    const claimAndOrchestrate = claimAndOrchestrateRequest({
      ...deps,
      llm: createScriptedLlmClient({ ok: true, json: { subtasks: [] } }),
    });

    const outcome = await claimAndOrchestrate();

    expect(outcome.ok).toBe(false);
    const [task] = await deps.tasks.list();
    expect([task.status, task.attempts, task.reviewReason]).toEqual(["review", 3, "attempts"]);
  });

  it("reports that nothing is ready and creates nothing", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [] });
    const claimAndOrchestrate = claimAndOrchestrateRequest({
      ...deps,
      llm: createScriptedLlmClient({ ok: true, json: validPlan }),
    });

    const outcome = await claimAndOrchestrate();

    expect(outcome).toEqual({ ok: false, reason: "No task is ready to claim" });
    expect(await deps.tasks.list()).toEqual([]);
  });
});
