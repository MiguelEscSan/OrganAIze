import { describe, expect, it } from "vitest";
import { groupTasksByStatus } from "./group-tasks-by-status";
import type { Task } from "./task";

const createTask = (overrides: Partial<Task>): Task => ({
  id: "task-1",
  requestId: "request-1",
  title: "Create contact page",
  description: "Add a contact route with a form",
  status: "ready",
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,
  ...overrides,
});

describe("groupTasksByStatus", () => {
  it("places each task under its status", () => {
    const tasks = [
      createTask({ id: "a", status: "ready" }),
      createTask({ id: "b", status: "in_progress" }),
      createTask({ id: "c", status: "qa" }),
      createTask({ id: "d", status: "deploy" }),
    ];

    const grouped = groupTasksByStatus(tasks);

    expect(grouped.ready.map((task) => task.id)).toEqual(["a"]);
    expect(grouped.in_progress.map((task) => task.id)).toEqual(["b"]);
    expect(grouped.qa.map((task) => task.id)).toEqual(["c"]);
    expect(grouped.deploy.map((task) => task.id)).toEqual(["d"]);
  });

  it("keeps every status key even when it has no tasks", () => {
    const grouped = groupTasksByStatus([]);

    expect(grouped).toEqual({
      definition: [],
      ready: [],
      in_progress: [],
      qa: [],
      deploy: [],
      review: [],
    });
  });

  it("preserves the input order inside a status", () => {
    const tasks = [
      createTask({ id: "first", status: "ready" }),
      createTask({ id: "second", status: "ready" }),
      createTask({ id: "third", status: "ready" }),
    ];

    const grouped = groupTasksByStatus(tasks);

    expect(grouped.ready.map((task) => task.id)).toEqual(["first", "second", "third"]);
  });
});
