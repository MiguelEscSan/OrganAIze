import type { Task } from "@/domain/tasks/task";
import { runDevelop, type DevelopDependencies } from "./run-develop";

const nextRunnableSubtask = async (deps: DevelopDependencies, parentTaskId: string): Promise<Task | undefined> =>
  (await deps.tasks.list()).find(
    (task) => task.parentTaskId === parentTaskId && task.status === "in_progress" && task.assignedAgent === "develop",
  );

export const runDevelopSubtasks =
  (deps: DevelopDependencies) =>
  async (parentTaskId: string): Promise<void> => {
    for (;;) {
      const subtask = await nextRunnableSubtask(deps, parentTaskId);

      if (!subtask) {
        return;
      }

      const outcome = await runDevelop(deps)({ kind: "RunDevelop", taskId: subtask.id });

      if (outcome.ok) {
        continue;
      }

      const after = (await deps.tasks.list()).find((task) => task.id === subtask.id);

      if (!after || after.status !== "in_progress" || after.attempts === subtask.attempts) {
        return;
      }
    }
  };
