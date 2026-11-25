import type { TasksByStatus } from "./group-tasks-by-status";
import type { Task } from "./task";
import type { TaskStatus } from "./task-status";

export type FamilySummary = {
  title: string;
  total: number;
  deployed: number;
};

export type ColumnEntry =
  | { kind: "task"; task: Task }
  | { kind: "family"; parentId: string; parent: Task | null; summary: FamilySummary; children: Task[] };

const fallbackRequestTitle = "Request";

const allTasksOf = (tasksByStatus: TasksByStatus): Task[] => Object.values(tasksByStatus).flat();

const indexChildrenByParent = (tasks: readonly Task[]): Map<string, Task[]> => {
  const index = new Map<string, Task[]>();

  for (const task of tasks) {
    if (task.parentTaskId !== null) {
      index.set(task.parentTaskId, [...(index.get(task.parentTaskId) ?? []), task]);
    }
  }

  return index;
};

const summarize = (title: string, allChildren: readonly Task[]): FamilySummary => ({
  title,
  total: allChildren.length,
  deployed: allChildren.filter((child) => child.status === "deploy").length,
});

export const groupColumnIntoFamilies = (status: TaskStatus, tasksByStatus: TasksByStatus): ColumnEntry[] => {
  const column = tasksByStatus[status];
  const allTasks = allTasksOf(tasksByStatus);
  const childrenByParent = indexChildrenByParent(allTasks);
  const columnRootIds = new Set(column.filter((task) => task.parentTaskId === null).map((task) => task.id));
  const emittedFamilies = new Set<string>();
  const entries: ColumnEntry[] = [];

  const buildFamily = (parentId: string, parent: Task | null): ColumnEntry => {
    const allChildren = childrenByParent.get(parentId) ?? [];
    const parentTitle = parent?.title ?? allTasks.find((task) => task.id === parentId)?.title;

    return {
      kind: "family",
      parentId,
      parent,
      summary: summarize(parentTitle ?? fallbackRequestTitle, allChildren),
      children: column.filter((task) => task.parentTaskId === parentId),
    };
  };

  for (const task of column) {
    if (task.parentTaskId === null) {
      const hasChildren = (childrenByParent.get(task.id) ?? []).length > 0;
      entries.push(hasChildren ? buildFamily(task.id, task) : { kind: "task", task });
      emittedFamilies.add(task.id);
      continue;
    }

    const parentIsHere = columnRootIds.has(task.parentTaskId);
    if (parentIsHere || emittedFamilies.has(task.parentTaskId)) {
      continue;
    }

    entries.push(buildFamily(task.parentTaskId, null));
    emittedFamilies.add(task.parentTaskId);
  }

  return entries;
};
