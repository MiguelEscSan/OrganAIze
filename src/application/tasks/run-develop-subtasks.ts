import type { Task } from "@/domain/tasks/task";
import { runDevelop, type DevelopDependencies } from "./run-develop";

const runnableSubtasks = async (deps: DevelopDependencies, parentTaskId: string): Promise<Task[]> =>
  (await deps.tasks.list()).filter(
    (task) => task.parentTaskId === parentTaskId && task.status === "in_progress" && task.assignedAgent === "develop",
  );

const nextBatch = (subtasks: Task[]): Task[] => {
  const parallel = subtasks.filter((task) => task.runsInParallel === true);

  return parallel.length > 0 ? parallel : subtasks.slice(0, 1);
};

const isStalled = async (deps: DevelopDependencies, subtask: Task, succeeded: boolean): Promise<boolean> => {
  if (succeeded) {
    return false;
  }

  const after = (await deps.tasks.list()).find((task) => task.id === subtask.id);

  return !after || after.status !== "in_progress" || after.attempts === subtask.attempts;
};

const developBatch = (deps: DevelopDependencies, batch: Task[]) =>
  Promise.all(
    batch.map(async (subtask) => ({
      subtask,
      succeeded: (await runDevelop(deps)({ kind: "RunDevelop", taskId: subtask.id })).ok,
    })),
  );

export const runDevelopSubtasks =
  (deps: DevelopDependencies) =>
  async (parentTaskId: string): Promise<void> => {
    for (;;) {
      const batch = nextBatch(await runnableSubtasks(deps, parentTaskId));

      if (batch.length === 0) {
        return;
      }

      const results = await developBatch(deps, batch);
      const stalled = await Promise.all(results.map(({ subtask, succeeded }) => isStalled(deps, subtask, succeeded)));

      if (stalled.some(Boolean)) {
        return;
      }
    }
  };
