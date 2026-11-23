import type { Task } from "@/domain/tasks/task";
import type { TaskEvent } from "@/domain/tasks/task-event";
import type { ApplicationDependencies } from "../shared/dependencies";

export const recordTransition = async (
  deps: ApplicationDependencies,
  tasks: readonly Task[],
  event: TaskEvent,
): Promise<void> => {
  await deps.tasks.replaceAll(tasks);
  await deps.events.append(event);
};
