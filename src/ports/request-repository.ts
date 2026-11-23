import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { TaskStatus } from "@/domain/tasks/task-status";
import type { WriteOutcome } from "./task-repository";

export type RequestRepository = {
  list(): Promise<Request[]>;
  saveWithTasks(request: Request, tasks: readonly Task[]): Promise<void>;
  removeWithTasksIfStatuses(requestId: string, allowedStatuses: readonly TaskStatus[]): Promise<WriteOutcome>;
};
