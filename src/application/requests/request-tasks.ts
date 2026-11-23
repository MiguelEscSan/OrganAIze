import type { Task } from "@/domain/tasks/task";

export const tasksOfRequest = (tasks: readonly Task[], requestId: string): Task[] =>
  tasks.filter((task) => task.requestId === requestId);
