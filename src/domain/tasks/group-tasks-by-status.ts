import type { Task } from "./task";
import type { TaskStatus } from "./task-status";

export type TasksByStatus = Record<TaskStatus, Task[]>;

export const groupTasksByStatus = (tasks: readonly Task[]): TasksByStatus => {
  const grouped: TasksByStatus = { ready: [], in_progress: [], qa: [], deploy: [] };

  for (const task of tasks) {
    grouped[task.status].push(task);
  }

  return grouped;
};
