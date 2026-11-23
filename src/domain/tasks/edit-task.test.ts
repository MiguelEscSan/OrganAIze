import { describe, expect, it } from "vitest";
import type { Task } from "./task";
import { deleteTask, editTaskDetails } from "./edit-task";

const createTask = (overrides: Partial<Task>): Task => ({
  id: "task-1",
  requestId: "request-1",
  title: "Create contact route",
  description: "<p>Add the contact page</p>",
  status: "definition",
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  ...overrides,
});

describe("editTaskDetails", () => {
  it("updates title and description of a task in definition", () => {
    const tasks = [createTask({ id: "a", status: "definition" })];

    const result = editTaskDetails(tasks, "a", { title: "New title", description: "<p>New body</p>" });

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks[0]).toMatchObject({ title: "New title", description: "<p>New body</p>" });
  });

  it("refuses to edit a task that already left definition", () => {
    const tasks = [createTask({ id: "a", status: "ready" })];

    const result = editTaskDetails(tasks, "a", { title: "Changed", description: "<p>Changed</p>" });

    expect(result.ok).toBe(false);
  });

  it("refuses an empty title", () => {
    const tasks = [createTask({ id: "a", status: "definition" })];

    const result = editTaskDetails(tasks, "a", { title: "   ", description: "<p>Body</p>" });

    expect(result.ok).toBe(false);
  });
});

describe("deleteTask", () => {
  it("removes a task that is still in definition", () => {
    const tasks = [createTask({ id: "a", status: "definition" }), createTask({ id: "b", status: "ready" })];

    const result = deleteTask(tasks, "a");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tasks.map((task) => task.id)).toEqual(["b"]);
  });

  it("refuses to delete a task that already left definition", () => {
    const tasks = [createTask({ id: "a", status: "ready" })];

    const result = deleteTask(tasks, "a");

    expect(result.ok).toBe(false);
  });
});
