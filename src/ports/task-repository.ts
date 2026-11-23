import type { Task } from "@/domain/tasks/task";

export type TaskRepository = {
  list(): Promise<Task[]>;
  replaceAll(tasks: readonly Task[]): Promise<void>;
};
