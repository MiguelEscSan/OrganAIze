import type { AgentName } from "../agents/agent-name";
import type { TasksByStatus } from "./group-tasks-by-status";
import { agentRunningTask } from "./agent-running-task";
import type { Task } from "./task";
import { taskStatuses, type TaskStatus } from "./task-status";

export type FamilySummary = {
  title: string;
  total: number;
  deployed: number;
  byStatus: Record<TaskStatus, number>;
  workingByAgent: Partial<Record<AgentName, number>>;
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

const countByStatus = (children: readonly Task[]): Record<TaskStatus, number> => {
  const counts = Object.fromEntries(taskStatuses.map((status) => [status, 0])) as Record<TaskStatus, number>;

  for (const child of children) {
    counts[child.status] += 1;
  }

  return counts;
};

const countWorkingByAgent = (children: readonly Task[]): Partial<Record<AgentName, number>> => {
  const counts: Partial<Record<AgentName, number>> = {};

  for (const child of children) {
    const running = agentRunningTask(child);

    if (running !== null) {
      counts[running] = (counts[running] ?? 0) + 1;
    }
  }

  return counts;
};

const summarize = (title: string, allChildren: readonly Task[]): FamilySummary => ({
  title,
  total: allChildren.length,
  deployed: allChildren.filter((child) => child.status === "deploy").length,
  byStatus: countByStatus(allChildren),
  workingByAgent: countWorkingByAgent(allChildren),
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
