import { describe, expect, it } from "vitest";
import { groupColumnIntoFamilies } from "./group-column-into-families";
import type { TasksByStatus } from "./group-tasks-by-status";
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

const emptySummary = {
  title: "",
  total: 0,
  deployed: 0,
  byStatus: { definition: 0, ready: 0, in_progress: 0, qa: 0, deploy: 0, review: 0 },
  workingByAgent: {},
};

const board = (tasks: Task[]): TasksByStatus => {
  const grouped: TasksByStatus = { definition: [], ready: [], in_progress: [], qa: [], deploy: [], review: [] };
  for (const task of tasks) {
    grouped[task.status].push(task);
  }
  return grouped;
};

describe("groupColumnIntoFamilies", () => {
  it("returns no entries for an empty column", () => {
    expect(groupColumnIntoFamilies("qa", board([]))).toEqual([]);
  });

  it("keeps standalone requests as plain task entries", () => {
    const first = createTask({ id: "a", status: "ready" });
    const second = createTask({ id: "b", status: "ready" });

    expect(groupColumnIntoFamilies("ready", board([first, second]))).toEqual([
      { kind: "task", task: first },
      { kind: "task", task: second },
    ]);
  });

  it("groups children under their parent when both are in the column", () => {
    const parent = createTask({ id: "parent" });
    const child = createTask({ id: "child", parentTaskId: "parent" });

    expect(groupColumnIntoFamilies("in_progress", board([parent, child]))).toEqual([
      {
        kind: "family",
        parentId: "parent",
        parent,
        summary: { ...emptySummary, title: "parent", total: 1, byStatus: { ...emptySummary.byStatus, in_progress: 1 } },
        children: [child],
      },
    ]);
  });

  it("builds a ghost family when children live in a column without their parent", () => {
    const parent = createTask({ id: "parent", title: "Build the site" });
    const child = createTask({ id: "child", parentTaskId: "parent", status: "qa" });

    const entries = groupColumnIntoFamilies("qa", board([parent, child]));

    expect(entries).toEqual([
      {
        kind: "family",
        parentId: "parent",
        parent: null,
        summary: { ...emptySummary, title: "Build the site", total: 1, byStatus: { ...emptySummary.byStatus, qa: 1 } },
        children: [child],
      },
    ]);
  });

  it("counts children across every column in the summary", () => {
    const parent = createTask({ id: "parent" });
    const working = createTask({ id: "working", parentTaskId: "parent" });
    const inQa = createTask({ id: "in-qa", parentTaskId: "parent", status: "qa" });
    const doneOne = createTask({ id: "done-1", parentTaskId: "parent", status: "deploy" });
    const doneTwo = createTask({ id: "done-2", parentTaskId: "parent", status: "deploy" });

    const [entry] = groupColumnIntoFamilies("in_progress", board([parent, working, inQa, doneOne, doneTwo]));

    expect(entry).toMatchObject({ kind: "family", summary: { total: 4, deployed: 2 }, children: [working] });
  });

  it("falls back to a generic title when the parent is nowhere on the board", () => {
    const orphan = createTask({ id: "orphan", parentTaskId: "missing" });

    const [entry] = groupColumnIntoFamilies("in_progress", board([orphan]));

    expect(entry).toMatchObject({ kind: "family", parent: null, summary: { title: "Request" } });
  });

  it("places a family at its parent position and keeps child order", () => {
    const before = createTask({ id: "before" });
    const parent = createTask({ id: "parent" });
    const firstChild = createTask({ id: "child-1", parentTaskId: "parent" });
    const after = createTask({ id: "after" });
    const secondChild = createTask({ id: "child-2", parentTaskId: "parent" });

    const entries = groupColumnIntoFamilies(
      "in_progress",
      board([before, parent, firstChild, after, secondChild]),
    );

    expect(entries.map((entry) => (entry.kind === "task" ? entry.task.id : entry.parentId))).toEqual([
      "before",
      "parent",
      "after",
    ]);
    expect(entries[1]).toMatchObject({ children: [firstChild, secondChild] });
  });

  it("places a ghost family at the position of its first child", () => {
    const first = createTask({ id: "first", status: "qa" });
    const parent = createTask({ id: "parent" });
    const child = createTask({ id: "child", parentTaskId: "parent", status: "qa" });
    const last = createTask({ id: "last", status: "qa" });

    const entries = groupColumnIntoFamilies("qa", board([first, child, last, parent]));

    expect(entries.map((entry) => (entry.kind === "task" ? entry.task.id : entry.parentId))).toEqual([
      "first",
      "parent",
      "last",
    ]);
  });

  it("never duplicates a child", () => {
    const parent = createTask({ id: "parent" });
    const child = createTask({ id: "child", parentTaskId: "parent" });

    const entries = groupColumnIntoFamilies("in_progress", board([parent, child]));
    const rendered = entries.flatMap((entry) => (entry.kind === "task" ? [entry.task] : entry.children));

    expect(rendered.filter((task) => task.id === "child")).toHaveLength(1);
  });

  it("counts subtasks per status across every column", () => {
    const parent = createTask({ id: "parent" });
    const working = createTask({ id: "working", parentTaskId: "parent" });
    const inQa = createTask({ id: "in-qa", parentTaskId: "parent", status: "qa" });
    const stuck = createTask({ id: "stuck", parentTaskId: "parent", status: "review" });

    const [entry] = groupColumnIntoFamilies("in_progress", board([parent, working, inQa, stuck]));

    expect(entry).toMatchObject({
      summary: { byStatus: { in_progress: 1, qa: 1, review: 1, deploy: 0, ready: 0, definition: 0 } },
    });
  });

  it("counts subtasks with a live status per assigned agent", () => {
    const parent = createTask({ id: "parent" });
    const developing = createTask({
      id: "developing",
      parentTaskId: "parent",
      assignedAgent: "develop",
      liveStatus: "Writing files",
    });
    const alsoDeveloping = createTask({
      id: "also-developing",
      parentTaskId: "parent",
      assignedAgent: "develop",
      liveStatus: "Reading context",
    });
    const reviewing = createTask({
      id: "reviewing",
      parentTaskId: "parent",
      status: "qa",
      assignedAgent: "testing",
      liveStatus: "Checking criteria",
    });
    const idle = createTask({ id: "idle", parentTaskId: "parent", assignedAgent: "develop", liveStatus: "" });
    const unassigned = createTask({ id: "unassigned", parentTaskId: "parent", liveStatus: "Working" });

    const [entry] = groupColumnIntoFamilies(
      "in_progress",
      board([parent, developing, alsoDeveloping, reviewing, idle, unassigned]),
    );

    expect(entry).toMatchObject({ summary: { workingByAgent: { develop: 2, testing: 1 } } });
  });
});
