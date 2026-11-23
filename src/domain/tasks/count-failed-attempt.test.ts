import { describe, expect, it } from "vitest";
import type { Task } from "./task";
import { countFailedAttempt } from "./count-failed-attempt";

const parent: Task = {
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

describe("countFailedAttempt", () => {
  it("keeps the task in progress and counts the attempt", () => {
    const result = countFailedAttempt([parent], "task-1", "Plan was not valid JSON");

    expect(result).toEqual({
      ok: true,
      task: { ...parent, attempts: 1, lastFeedback: "Plan was not valid JSON" },
      event: { taskId: "task-1", from: "in_progress", to: "in_progress", actor: "system", reason: "Plan was not valid JSON" },
    });
  });

  it("moves the task to review on the third failed attempt", () => {
    const thirdAttempt: Task = { ...parent, attempts: 2 };

    const result = countFailedAttempt([thirdAttempt], "task-1", "Plan had no subtasks");

    expect(result).toMatchObject({
      ok: true,
      task: { status: "review", attempts: 3, reviewReason: "attempts" },
      event: { from: "in_progress", to: "review" },
    });
  });

  it("refuses a task that is not in progress", () => {
    const ready: Task = { ...parent, status: "ready" };

    expect(countFailedAttempt([ready], "task-1", "reason")).toEqual({
      ok: false,
      reason: "Only tasks in progress can count a failed attempt",
    });
  });

  it("refuses an empty reason", () => {
    expect(countFailedAttempt([parent], "task-1", "   ")).toEqual({
      ok: false,
      reason: "A failed attempt needs a reason",
    });
  });
});
