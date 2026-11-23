import type { Task } from "@/domain/tasks/task";
import type { TaskEvent } from "@/domain/tasks/task-event";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";

export const conflictReason = "The task changed while this request was processed. Try again.";

export const recordTransition = async (
  deps: ApplicationDependencies,
  before: Task,
  after: Task,
  event: TaskEvent,
): Promise<Outcome<Task>> => {
  const outcome = await deps.tasks.applyTransition({ task: after, expectedStatus: before.status, event });

  return outcome === "applied" ? succeed(after) : fail(conflictReason);
};
