import type { Task } from "./task";
import type { TaskStatus } from "./task-status";

export type TasksByStatus = Record<TaskStatus, Task[]>;

export const groupTasksByStatus = (tasks: readonly Task[]): TasksByStatus => {
  const grouped: TasksByStatus = {
    definition: [],
    ready: [],
    in_progress: [],
    qa: [],
    awaiting_release: [],
    deploy: [],
    review: [],
  };

  for (const task of tasks) {
    grouped[task.status].push(task);
  }

  return grouped;
};
