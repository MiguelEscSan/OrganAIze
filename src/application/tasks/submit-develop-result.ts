import type { Task } from "@/domain/tasks/task";
import { transitionTask } from "@/domain/tasks/transition-task";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, type Outcome } from "../shared/outcome";
import { qaFullReason } from "./qa-capacity";
import { recordTransition } from "./record-transition";

export type SubmitDevelopResult = { kind: "SubmitDevelopResult"; taskId: string };

export const submitDevelopResult =
  (deps: ApplicationDependencies) =>
  async (command: SubmitDevelopResult): Promise<Outcome<Task>> => {
    const tasks = await deps.tasks.list();
    const before = tasks.find((task) => task.id === command.taskId);
    const result = transitionTask(tasks, command.taskId, "qa", "system");

    if (!result.ok || !before) {
      return fail(result.ok ? "Task not found" : result.reason);
    }

    const settings = await deps.settings.get();
    const full = qaFullReason(tasks, settings.maxQaTasks);

    if (full) {
      return fail(full);
    }

    const after = result.tasks.find((task) => task.id === command.taskId);

    if (!after) {
      return fail("Task not found");
    }

    return recordTransition(deps, before, after, result.event);
  };
