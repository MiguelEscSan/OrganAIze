import { describe, expect, it } from "vitest";
import type { Task } from "./task";
import { sendToReview } from "./send-to-review";

const inProgress: Task = {
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

describe("sendToReview", () => {
  it("moves an in-progress task to review with the orchestration reason", () => {
    const result = sendToReview([inProgress], "task-1", "Gemini is unavailable");

    expect(result).toEqual({
      ok: true,
      task: { ...inProgress, status: "review", lastFeedback: "Gemini is unavailable", reviewReason: "orchestration" },
      event: { taskId: "task-1", from: "in_progress", to: "review", actor: "system", reason: "Gemini is unavailable" },
    });
  });

  it("refuses a task that is not in progress", () => {
    expect(sendToReview([{ ...inProgress, status: "review" }], "task-1", "reason")).toEqual({
      ok: false,
      reason: "Only tasks in progress can be sent to review after a failure",
    });
  });

  it("refuses an empty reason", () => {
    expect(sendToReview([inProgress], "task-1", "  ")).toEqual({ ok: false, reason: "A review needs a reason" });
  });
});
