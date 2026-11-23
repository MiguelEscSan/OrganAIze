import type { Task } from "@/domain/tasks/task";
import { stopForBudget } from "@/domain/tasks/budget";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, type Outcome } from "../shared/outcome";
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
    const before = tasks.find((task) => task.id === command.taskId);
    const result = stopForBudget(tasks, command.taskId, command.reason);

    if (!result.ok || !before) {
      return fail(result.ok ? "Task not found" : result.reason);
    }

    const after = result.tasks.find((task) => task.id === command.taskId);

    if (!after) {
      return fail("Task not found");
    }

    return recordTransition(deps, before, after, {
      taskId: command.taskId,
      from: "in_progress",
      to: "review",
      actor: "system",
      reason: command.reason.trim(),
    });
  };
