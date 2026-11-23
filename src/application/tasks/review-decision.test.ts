import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { decideReview } from "./review-decision";

describe("decideReview", () => {
  it("sends a review task back to ready and resets its attempts", async () => {
    const deps = createInMemoryDependencies({
      tasks: [buildTask({ id: "t1", status: "review", attempts: 3, lastFeedback: "3. Broken", reviewReason: "attempts" })],
    });

    const outcome = await decideReview(deps)({ kind: "DecideReview", taskId: "t1", decision: "send_to_ready" });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list())[0]).toMatchObject({
      status: "ready",
      attempts: 0,
      lastFeedback: "3. Broken",
      reviewReason: null,
    });
    expect(await deps.events.list()).toEqual([
      expect.objectContaining({ taskId: "t1", from: "review", to: "ready", actor: "user" }),
    ]);
  });

  it("continues a budget-stopped task into in_progress with the same attempts", async () => {
    const deps = createInMemoryDependencies({
      tasks: [buildTask({ id: "t1", status: "review", attempts: 1, reviewReason: "budget" })],
    });

    const outcome = await decideReview(deps)({ kind: "DecideReview", taskId: "t1", decision: "continue" });

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

    const outcome = await decideReview(deps)({ kind: "DecideReview", taskId: "t1", decision: "continue" });

    expect(outcome).toEqual({ ok: false, reason: "Only a task stopped by budget can be continued" });
    expect((await deps.tasks.list())[0].status).toBe("review");
  });

  it("deletes a review task without recording a transition", async () => {
    const deps = createInMemoryDependencies({
      tasks: [buildTask({ id: "t1", status: "review", reviewReason: "attempts" }), buildTask({ id: "t2", status: "ready" })],
    });

    const outcome = await decideReview(deps)({ kind: "DecideReview", taskId: "t1", decision: "delete" });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list()).map((task) => task.id)).toEqual(["t2"]);
    expect(await deps.events.list()).toEqual([]);
  });

  it("refuses a decision on a task that is not in review", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "qa" })] });

    const outcome = await decideReview(deps)({ kind: "DecideReview", taskId: "t1", decision: "send_to_ready" });

    expect(outcome).toEqual({ ok: false, reason: "user cannot move a task from qa to ready" });
  });
});
