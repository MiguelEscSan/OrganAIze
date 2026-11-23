import type { Task } from "@/domain/tasks/task";
import { stopForBudget } from "@/domain/tasks/budget";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { recordTransition } from "./record-transition";

export type StopTaskForBudget = {
  kind: "StopTaskForBudget";
  taskId: string;
  reason: string;
};

export const stopTaskForBudget =
  (deps: ApplicationDependencies) =>
  async (command: StopTaskForBudget): Promise<Outcome<Task>> => {
    const tasks = await deps.tasks.list();
    const result = stopForBudget(tasks, command.taskId, command.reason);

    if (!result.ok) {
      return fail(result.reason);
    }

    await recordTransition(deps, result.tasks, {
      taskId: command.taskId,
      from: "in_progress",
      to: "review",
      actor: "system",
      reason: command.reason.trim(),
    });

    const stopped = result.tasks.find((task) => task.id === command.taskId);

    return stopped ? succeed(stopped) : fail("Task not found");
  };
