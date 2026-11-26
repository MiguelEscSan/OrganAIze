import { describe, expect, it } from "vitest";
import type { TasksByStatus } from "./group-tasks-by-status";
import { listFamilySiblings } from "./list-family-siblings";
import type { Task } from "./task";

const createTask = (overrides: Partial<Task> & Pick<Task, "id">): Task => ({
  requestId: "request-1",
  title: overrides.id,
  description: "",
  acceptanceCriteria: [],
  files: [],
  status: "in_progress",
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,
  parentTaskId: null,
  ...overrides,
});

const board = (tasks: Task[]): TasksByStatus => {
  const grouped: TasksByStatus = { definition: [], ready: [], in_progress: [], qa: [], awaiting_release: [], deploy: [], review: [] };
  for (const task of tasks) {
    grouped[task.status].push(task);
  }
  return grouped;
};

describe("listFamilySiblings", () => {
  it("returns null for a request", () => {
    const request = createTask({ id: "parent" });

    expect(listFamilySiblings(request, board([request]))).toBeNull();
  });

  it("finds siblings across columns in board order", () => {
    const parent = createTask({ id: "parent", title: "Build the page" });
    const inReview = createTask({ id: "review-child", parentTaskId: "parent", status: "review" });
    const deployed = createTask({ id: "deploy-child", parentTaskId: "parent", status: "deploy" });
    const working = createTask({ id: "working-child", parentTaskId: "parent", status: "in_progress" });
    const unrelated = createTask({ id: "other", parentTaskId: "someone-else", status: "qa" });

    const family = listFamilySiblings(working, board([parent, inReview, deployed, working, unrelated]));

    expect(family?.siblings.map((sibling) => sibling.id)).toEqual(["working-child", "deploy-child", "review-child"]);
  });

  it("keeps the column order inside one status", () => {
    const first = createTask({ id: "first", parentTaskId: "parent" });
    const second = createTask({ id: "second", parentTaskId: "parent" });

    const family = listFamilySiblings(second, board([first, second]));

    expect(family?.siblings.map((sibling) => sibling.id)).toEqual(["first", "second"]);
  });

  it("includes the task itself", () => {
    const only = createTask({ id: "only", parentTaskId: "parent" });

    expect(listFamilySiblings(only, board([only]))?.siblings).toEqual([only]);
  });

  it("counts total and deployed siblings and uses the parent title", () => {
    const parent = createTask({ id: "parent", title: "Build the page" });
    const deployed = createTask({ id: "a", parentTaskId: "parent", status: "deploy" });
    const working = createTask({ id: "b", parentTaskId: "parent", status: "qa" });

    expect(listFamilySiblings(working, board([parent, deployed, working]))).toMatchObject({
      title: "Build the page",
      total: 2,
      deployed: 1,
    });
  });

  it("falls back to a generic title when the parent is missing", () => {
    const orphan = createTask({ id: "orphan", parentTaskId: "gone" });

    expect(listFamilySiblings(orphan, board([orphan]))?.title).toBe("Request");
  });
});
