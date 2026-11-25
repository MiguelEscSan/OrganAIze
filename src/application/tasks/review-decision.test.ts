import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { inMemoryWorkspaceDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import type { Request } from "@/domain/requests/request";
import { decideReview } from "./review-decision";

const withOrchestration = (deps: ReturnType<typeof createInMemoryDependencies>) => ({
  ...deps,
  ...inMemoryWorkspaceDependencies(createInMemoryWorkspaceWriter({})),
  llm: createScriptedLlmClient({ ok: true, json: validPlan }),
});

const request: Request = { id: "request-1", boardId: "board-1", title: "Landing", description: "A landing page" };

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

describe("decideReview", () => {
  it("starts the orchestrator when a task sent back to ready was rejected by orchestration", async () => {
    const deps = createInMemoryDependencies({
      requests: [request],
      tasks: [
        buildTask({ id: "t1", requestId: "request-1", status: "review", attempts: 3, reviewReason: "orchestration" }),
        buildTask({ id: "t2", requestId: "request-1", status: "ready" }),
      ],
    });
    const decide = decideReview({
      ...deps,
      ...inMemoryWorkspaceDependencies(createInMemoryWorkspaceWriter({})),
      llm: createScriptedLlmClient({ ok: true, json: validPlan }),
    });

    const outcome = await decide({ kind: "DecideReview", taskId: "t1", decision: "send_to_ready" });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list()).find((task) => task.id === "t1")?.status).toBe("in_progress");
  });

  it("sends a review task back to ready, resets its attempts and starts it", async () => {
    const deps = createInMemoryDependencies({
      requests: [request],
      tasks: [
        buildTask({ id: "t1", requestId: "request-1", status: "review", attempts: 3, lastFeedback: "3. Broken", reviewReason: "attempts" }),
      ],
    });

    const outcome = await decideReview(withOrchestration(deps))({ kind: "DecideReview", taskId: "t1", decision: "send_to_ready" });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list()).find((task) => task.id === "t1")).toMatchObject({
      status: "in_progress",
      attempts: 0,
      lastFeedback: "3. Broken",
      reviewReason: null,
      parentTaskId: null,
    });
    expect(await deps.events.list()).toEqual(
      expect.arrayContaining([expect.objectContaining({ taskId: "t1", from: "review", to: "ready", actor: "user" })]),
    );
  });

  it("sends a rejected subtask straight back to in progress and develops it again", async () => {
    const deps = createInMemoryDependencies({
      requests: [request],
      tasks: [
        buildTask({ id: "p1", requestId: "request-1", status: "in_progress" }),
        buildTask({
          id: "t1",
          requestId: "request-1",
          parentTaskId: "p1",
          status: "review",
          assignedAgent: "develop",
          attempts: 3,
          lastFeedback: "1. Headline missing",
          reviewReason: "attempts",
        }),
      ],
    });
    const decide = decideReview({
      ...deps,
      ...inMemoryWorkspaceDependencies(createInMemoryWorkspaceWriter({})),
      llm: createScriptedLlmClient({ ok: false, reason: "Ollama is unavailable" }),
    });

    const outcome = await decide({ kind: "DecideReview", taskId: "t1", decision: "send_to_ready" });

    expect(outcome.ok).toBe(true);
    const subtask = (await deps.tasks.list()).find((task) => task.id === "t1");
    expect([subtask?.status, subtask?.attempts, subtask?.lastFeedback, subtask?.parentTaskId]).toEqual([
      "review",
      3,
      "Ollama is unavailable",
      "p1",
    ]);
    expect(await deps.events.list()).toEqual(
      expect.arrayContaining([expect.objectContaining({ taskId: "t1", from: "review", to: "in_progress", actor: "user" })]),
    );
    expect(await deps.events.list()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ taskId: "t1", to: "ready" })]),
    );
  });

  it("continues a budget-stopped task into in_progress with the same attempts", async () => {
    const deps = createInMemoryDependencies({
      tasks: [buildTask({ id: "t1", status: "review", attempts: 1, reviewReason: "budget" })],
    });

    const outcome = await decideReview(withOrchestration(deps))({ kind: "DecideReview", taskId: "t1", decision: "continue" });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list())[0]).toMatchObject({ status: "in_progress", attempts: 1, reviewReason: null });
    expect(await deps.events.list()).toEqual([
      expect.objectContaining({ taskId: "t1", from: "review", to: "in_progress", actor: "user" }),
    ]);
  });

  it("refuses to continue a task that was rejected by attempts", async () => {
    const deps = createInMemoryDependencies({
      tasks: [buildTask({ id: "t1", status: "review", attempts: 3, reviewReason: "attempts" })],
    });

    const outcome = await decideReview(withOrchestration(deps))({ kind: "DecideReview", taskId: "t1", decision: "continue" });

    expect(outcome).toEqual({ ok: false, reason: "Only a task stopped by budget can be continued" });
    expect((await deps.tasks.list())[0].status).toBe("review");
  });

  it("deletes a review task without recording a transition", async () => {
    const deps = createInMemoryDependencies({
      tasks: [buildTask({ id: "t1", status: "review", reviewReason: "attempts" }), buildTask({ id: "t2", status: "ready" })],
    });

    const outcome = await decideReview(withOrchestration(deps))({ kind: "DecideReview", taskId: "t1", decision: "delete" });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list()).map((task) => task.id)).toEqual(["t2"]);
    expect(await deps.events.list()).toEqual([]);
  });

  it("refuses a decision on a task that is not in review", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "qa" })] });

    const outcome = await decideReview(withOrchestration(deps))({ kind: "DecideReview", taskId: "t1", decision: "send_to_ready" });

    expect(outcome).toEqual({ ok: false, reason: "user cannot move a task from qa to ready" });
  });
});
