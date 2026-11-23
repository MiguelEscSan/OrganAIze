import type { Actor } from "./actor";
import type { TaskStatus } from "./task-status";

export type TaskEvent = {
  taskId: string;
  from: TaskStatus;
  to: TaskStatus;
  actor: Actor;
  reason: string;
};
