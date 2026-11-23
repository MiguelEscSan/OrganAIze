import type { Task } from "@/domain/tasks/task";
import type { TaskEvent } from "@/domain/tasks/task-event";
import type { TaskStatus } from "@/domain/tasks/task-status";

export type TransitionWrite = {
  task: Task;
  expectedStatus: TaskStatus;
  event: TaskEvent;
};

export type WriteOutcome = "applied" | "conflict";

export type TaskRepository = {
  list(): Promise<Task[]>;
  applyTransition(write: TransitionWrite): Promise<WriteOutcome>;
  removeIfStatus(taskId: string, allowedStatuses: readonly TaskStatus[]): Promise<WriteOutcome>;
};
