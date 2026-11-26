import { describe, expect, it } from "vitest";
import type { Task } from "./task";
import { rejectFromQa } from "./reject-task";

const createTask = (overrides: Partial<Task>): Task => ({
  id: "task-1",
  requestId: "request-1",
  title: "Validate form fields",
  description: "Email format and required fields",
  acceptanceCriteria: [],
  files: [],
  status: "qa",
  assignedAgent: "testing",
  attempts: 1,
  lastFeedback: null,
  reviewReason: null,

  parentTaskId: null,
  ...overrides,
});

describe("rejectFromQa", () => {
  it("sends a failed QA task back to in progress with its feedback", () => {
    const tasks = [createTask({ id: "a", status: "qa", attempts: 1 })];

    const result = rejectFromQa(tasks, "a", "1. Email accepts 'a@b'.", "substantive");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0]).toMatchObject({
      status: "in_progress",
      attempts: 2,
      lastFeedback: "1. Email accepts 'a@b'.",
      reviewReason: null,

      parentTaskId: null,
    });
  });

  it("blocks the task on the third substantive failure", () => {
    const tasks = [createTask({ id: "a", status: "qa", attempts: 2 })];

    const result = rejectFromQa(tasks, "a", "3. Still broken.", "substantive");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0]).toMatchObject({
      status: "review",
      attempts: 3,
      lastFeedback: "3. Still broken.",
      reviewReason: "attempts",
    });
  });

  it("keeps the task in progress on the third mechanical failure", () => {
    const tasks = [createTask({ id: "a", status: "qa", attempts: 2 })];

    const result = rejectFromQa(tasks, "a", "3. Syntax error.", "mechanical");

    expect(result.ok && result.tasks[0]).toMatchObject({ status: "in_progress", attempts: 3, reviewReason: null });
  });

  it("blocks the task on the sixth mechanical failure", () => {
    const tasks = [createTask({ id: "a", status: "qa", attempts: 5 })];

    const result = rejectFromQa(tasks, "a", "6. Syntax error.", "mechanical");

    expect(result.ok && result.tasks[0]).toMatchObject({ status: "review", attempts: 6, reviewReason: "attempts" });
  });

  it("blocks a task with earlier mechanical failures on a substantive failure past the normal limit", () => {
    const tasks = [createTask({ id: "a", status: "qa", attempts: 3 })];

    const result = rejectFromQa(tasks, "a", "4. Criterion unmet.", "substantive");

    expect(result.ok && result.tasks[0]).toMatchObject({ status: "review", attempts: 4 });
  });

  it("refuses to reject a task that is not in QA", () => {
    const tasks = [createTask({ id: "a", status: "in_progress" })];

    const result = rejectFromQa(tasks, "a", "Feedback", "substantive");

    expect(result.ok).toBe(false);
  });

  it("refuses a rejection without feedback", () => {
    const tasks = [createTask({ id: "a", status: "qa" })];

    const result = rejectFromQa(tasks, "a", "   ", "substantive");

    expect(result.ok).toBe(false);
  });
});
