import type { TaskRepository } from "@/ports/task-repository";

export const taskTitleOf = async (tasks: TaskRepository, taskId: string, fallback: string): Promise<string> =>
  (await tasks.list()).find((task) => task.id === taskId)?.title ?? fallback;
