import { describe, expect, it } from "vitest";
import type { Task } from "./task";
import { rejectFromQa } from "./reject-task";

const createTask = (overrides: Partial<Task>): Task => ({
  id: "task-1",
  requestId: "request-1",
  title: "Validate form fields",
  description: "Email format and required fields",
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

    const result = rejectFromQa(tasks, "a", "1. Email accepts 'a@b'.");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0]).toMatchObject({
      status: "in_progress",
      attempts: 2,
      lastFeedback: "1. Email accepts 'a@b'.",
      reviewReason: null,

      parentTaskId: null,
    });
  });

  it("blocks the task on the third failed QA", () => {
    const tasks = [createTask({ id: "a", status: "qa", attempts: 2 })];

    const result = rejectFromQa(tasks, "a", "3. Still broken.");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0]).toMatchObject({
      status: "review",
      attempts: 3,
      lastFeedback: "3. Still broken.",
      reviewReason: "attempts",
    });
  });

  it("refuses to reject a task that is not in QA", () => {
    const tasks = [createTask({ id: "a", status: "in_progress" })];

    const result = rejectFromQa(tasks, "a", "Feedback");

    expect(result.ok).toBe(false);
  });

  it("refuses a rejection without feedback", () => {
    const tasks = [createTask({ id: "a", status: "qa" })];

    const result = rejectFromQa(tasks, "a", "   ");

    expect(result.ok).toBe(false);
  });
});
