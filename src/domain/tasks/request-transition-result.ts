import type { Task } from "./task";
import type { TaskEvent } from "./task-event";

export type RequestTransitionResult =
  | { ok: true; tasks: Task[]; events: TaskEvent[] }
  | { ok: false; reason: string };
