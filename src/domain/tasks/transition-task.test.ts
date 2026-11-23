import { describe, expect, it } from "vitest";
import type { Task } from "./task";
import { transitionTask } from "./transition-task";

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
  ...overrides,
});

describe("transitionTask", () => {
  it("lets the user send a defined task to ready to develop", () => {
    const tasks = [createTask({ id: "a", status: "definition" })];

    const result = transitionTask(tasks, "a", "ready", "user");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0].status).toBe("ready");
  });

  it("lets the user send a ready task back to definition", () => {
    const tasks = [createTask({ id: "a", status: "ready" })];

    const result = transitionTask(tasks, "a", "definition", "user");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0].status).toBe("definition");
  });

  it("does not let the user pull a task out of progress back to definition", () => {
    const tasks = [createTask({ id: "a", status: "in_progress" })];

    const result = transitionTask(tasks, "a", "definition", "user");

    expect(result.ok).toBe(false);
  });

  it("does not let the user move a task into in progress", () => {
    const tasks = [createTask({ id: "a", status: "ready" })];

    const result = transitionTask(tasks, "a", "in_progress", "user");

    expect(result.ok).toBe(false);
  });

  it("does not let the system skip the definition step", () => {
    const tasks = [createTask({ id: "a", status: "definition" })];

    const result = transitionTask(tasks, "a", "ready", "system");

    expect(result.ok).toBe(false);
  });

  it("lets the system claim a ready task when nothing is in progress", () => {
    const tasks = [createTask({ id: "a", status: "ready" })];

    const result = transitionTask(tasks, "a", "in_progress", "system");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0].status).toBe("in_progress");
  });

  it("does not let the system send a QA task back without feedback", () => {
    const tasks = [createTask({ id: "a", status: "qa" })];

    const result = transitionTask(tasks, "a", "in_progress", "system");

    expect(result.ok).toBe(false);
  });

  it("lets the user send a task in review back to ready with attempts reset to zero", () => {
    const tasks = [createTask({ id: "a", status: "review", attempts: 3, lastFeedback: "Still broken" })];

    const result = transitionTask(tasks, "a", "ready", "user");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0]).toMatchObject({ status: "ready", attempts: 0 });
    expect(result.ok && result.tasks[0].lastFeedback).toBe("Still broken");
  });

  it("does not let the system move a task out of review", () => {
    const tasks = [createTask({ id: "a", status: "review" })];

    expect(transitionTask(tasks, "a", "ready", "system").ok).toBe(false);
    expect(transitionTask(tasks, "a", "in_progress", "system").ok).toBe(false);
  });

  it("does not let the user move a task out of review into in progress", () => {
    const tasks = [createTask({ id: "a", status: "review" })];

    expect(transitionTask(tasks, "a", "in_progress", "user").ok).toBe(false);
  });

  it("refuses a second task in progress", () => {
    const tasks = [
      createTask({ id: "a", status: "in_progress" }),
      createTask({ id: "b", status: "ready" }),
    ];

    const result = transitionTask(tasks, "b", "in_progress", "system");

    expect(result.ok).toBe(false);
  });

  it("does not modify the original list", () => {
    const tasks = [createTask({ id: "a", status: "definition" })];

    transitionTask(tasks, "a", "ready", "user");

    expect(tasks[0].status).toBe("definition");
  });
});
