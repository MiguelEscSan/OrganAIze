import { describe, expect, it } from "vitest";
import type { Task } from "./task";
import { transitionTask } from "./transition-task";
import { rejectFromQa } from "./reject-task";

const createTask = (overrides: Partial<Task>): Task => ({
  id: "task-1",
  requestId: "request-1",
  title: "Create contact route",
  description: "Add the contact page",
  status: "definition",
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,

  parentTaskId: null,
  ...overrides,
});

describe("task events", () => {
  it("records who moved a task and between which states", () => {
    const tasks = [createTask({ id: "a", status: "definition" })];

    const result = transitionTask(tasks, "a", "ready", "user");

    expect(result.ok && result.event).toEqual({
      taskId: "a",
      from: "definition",
      to: "ready",
      actor: "user",
      reason: "Moved by user",
    });
  });

  it("records the feedback as the reason for a QA rejection", () => {
    const tasks = [createTask({ id: "a", status: "qa", attempts: 0 })];

    const result = rejectFromQa(tasks, "a", "1. Email accepts 'a@b'.");

    expect(result.ok && result.event).toEqual({
      taskId: "a",
      from: "qa",
      to: "in_progress",
      actor: "system",
      reason: "1. Email accepts 'a@b'.",
    });
  });

  it("records no event when a transition is refused", () => {
    const tasks = [createTask({ id: "a", status: "ready" })];

    const result = transitionTask(tasks, "a", "deploy", "user");

    expect(result.ok).toBe(false);
    expect("event" in result).toBe(false);
  });
});
