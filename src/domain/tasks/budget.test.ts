import { describe, expect, it } from "vitest";
import type { Task } from "./task";
import { exceedsBudget, stopForBudget } from "./budget";
import { transitionTask } from "./transition-task";

const createTask = (overrides: Partial<Task>): Task => ({
  id: "task-1",
  requestId: "request-1",
  title: "Create contact route",
  description: "Add the contact page",
  status: "in_progress",
  assignedAgent: "develop",
  attempts: 1,
  lastFeedback: null,
  reviewReason: null,

  parentTaskId: null,
  ...overrides,
});

const budget = { maxMinutes: 15, maxTokens: 200_000 };

describe("exceedsBudget", () => {
  it("is false while the run is inside both budgets", () => {
    expect(exceedsBudget({ minutes: 10, tokens: 50_000 }, budget)).toBe(false);
  });

  it("is true when time goes over the limit", () => {
    expect(exceedsBudget({ minutes: 16, tokens: 1_000 }, budget)).toBe(true);
  });

  it("is true when tokens go over the limit", () => {
    expect(exceedsBudget({ minutes: 1, tokens: 250_000 }, budget)).toBe(true);
  });
});

describe("stopForBudget", () => {
  it("moves a running task to review with the reason and keeps its attempts", () => {
    const tasks = [createTask({ id: "a", status: "in_progress", attempts: 2 })];

    const result = stopForBudget(tasks, "a", "Stopped after 15 min without finishing");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0]).toMatchObject({
      status: "review",
      attempts: 2,
      lastFeedback: "Stopped after 15 min without finishing",
      reviewReason: "budget",
    });
  });

  it("refuses to stop a task that is not running", () => {
    const tasks = [createTask({ id: "a", status: "qa" })];

    expect(stopForBudget(tasks, "a", "Stopped").ok).toBe(false);
  });
});

describe("continuing a budget-stopped task", () => {
  it("lets the user continue a task stopped by budget, keeping its attempts", () => {
    const tasks = [
      createTask({ id: "a", status: "review", attempts: 2, reviewReason: "budget" }),
    ];

    const result = transitionTask(tasks, "a", "in_progress", "user");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0]).toMatchObject({ status: "in_progress", attempts: 2 });
  });

  it("does not let the user continue a task that was rejected too many times", () => {
    const tasks = [
      createTask({ id: "a", status: "review", attempts: 3, reviewReason: "attempts" }),
    ];

    expect(transitionTask(tasks, "a", "in_progress", "user").ok).toBe(false);
  });

  it("refuses to continue when another task is already in progress", () => {
    const tasks = [
      createTask({ id: "a", status: "review", reviewReason: "budget" }),
      createTask({ id: "b", status: "in_progress" }),
    ];

    expect(transitionTask(tasks, "a", "in_progress", "user").ok).toBe(false);
  });
});
