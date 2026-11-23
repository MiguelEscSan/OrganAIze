import type { Task } from "@/domain/tasks/task";
import { transitionTask } from "@/domain/tasks/transition-task";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { recordTransition } from "./record-transition";

export type SubmitDevelopResult = { kind: "SubmitDevelopResult"; taskId: string };

export const submitDevelopResult =
  (deps: ApplicationDependencies) =>
  async (command: SubmitDevelopResult): Promise<Outcome<Task>> => {
    const tasks = await deps.tasks.list();
    const result = transitionTask(tasks, command.taskId, "qa", "system");

    if (!result.ok) {
      return fail(result.reason);
    }

    await recordTransition(deps, result.tasks, result.event);

    const moved = result.tasks.find((task) => task.id === command.taskId);

    return moved ? succeed(moved) : fail("Task not found");
  };
