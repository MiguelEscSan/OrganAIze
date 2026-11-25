import type { TasksByStatus } from "./group-tasks-by-status";
import type { Task } from "./task";
import { taskStatuses } from "./task-status";

export type FamilySiblings = {
  title: string;
  total: number;
  deployed: number;
  siblings: Task[];
};

const fallbackRequestTitle = "Request";

const tasksInBoardOrder = (tasksByStatus: TasksByStatus): Task[] =>
  taskStatuses.flatMap((status) => tasksByStatus[status]);

export const listFamilySiblings = (task: Task, tasksByStatus: TasksByStatus): FamilySiblings | null => {
  if (task.parentTaskId === null) {
    return null;
  }

  const allTasks = tasksInBoardOrder(tasksByStatus);
  const siblings = allTasks.filter((candidate) => candidate.parentTaskId === task.parentTaskId);
  const parent = allTasks.find((candidate) => candidate.id === task.parentTaskId);

  return {
    title: parent?.title ?? fallbackRequestTitle,
    total: siblings.length,
    deployed: siblings.filter((sibling) => sibling.status === "deploy").length,
    siblings,
  };
};
