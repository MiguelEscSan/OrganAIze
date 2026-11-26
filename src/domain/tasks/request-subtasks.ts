import type { Task } from "./task";

export const subtasksOf = (tasks: readonly Task[], requestId: string): Task[] =>
  tasks.filter((task) => task.parentTaskId === requestId);

export const everySubtaskIs = (subtasks: readonly Task[], status: Task["status"]): boolean =>
  subtasks.length > 0 && subtasks.every((task) => task.status === status);
