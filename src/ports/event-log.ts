import type { TaskEvent } from "@/domain/tasks/task-event";

export type RecordedTaskEvent = TaskEvent & { at: string };

export type EventLog = {
  append(event: TaskEvent): Promise<void>;
  list(): Promise<RecordedTaskEvent[]>;
};
