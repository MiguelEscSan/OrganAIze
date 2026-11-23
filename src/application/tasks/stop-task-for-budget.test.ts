import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { stopTaskForBudget } from "./stop-task-for-budget";

describe("stopTaskForBudget", () => {
  it("moves the running task to review with the reason and keeps its attempts", async () => {
    const deps = createInMemoryDependencies({
      tasks: [buildTask({ id: "t1", status: "in_progress", attempts: 1 })],
    });

    const outcome = await stopTaskForBudget(deps)({
      kind: "StopTaskForBudget",
      taskId: "t1",
      reason: "Stopped after 15 min without finishing",
    });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list())[0]).toMatchObject({
      status: "review",
      attempts: 1,
      lastFeedback: "Stopped after 15 min without finishing",
      reviewReason: "budget",
    });
    expect(await deps.events.list()).toEqual([
      expect.objectContaining({
        taskId: "t1",
        from: "in_progress",
        to: "review",
        actor: "system",
        reason: "Stopped after 15 min without finishing",
      }),
    ]);
  });

  it("refuses a task that is not running", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "qa" })] });

    const outcome = await stopTaskForBudget(deps)({ kind: "StopTaskForBudget", taskId: "t1", reason: "Too slow" });

    expect(outcome).toEqual({ ok: false, reason: "Only a running task can be stopped for budget" });
    expect(await deps.events.list()).toEqual([]);
  });
});
