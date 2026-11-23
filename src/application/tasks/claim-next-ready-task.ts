import type { Task } from "@/domain/tasks/task";
import { transitionTask } from "@/domain/tasks/transition-task";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { recordTransition } from "./record-transition";

export type ClaimNextReadyTask = { kind: "ClaimNextReadyTask" };

export const claimNextReadyTask =
  (deps: ApplicationDependencies) =>
  async (): Promise<Outcome<Task>> => {
    const tasks = await deps.tasks.list();
    const next = tasks.find((task) => task.status === "ready");

    if (!next) {
      return fail("No task is ready to claim");
    }

    const result = transitionTask(tasks, next.id, "in_progress", "system");

    if (!result.ok) {
      return fail(result.reason);
    }

    await recordTransition(deps, result.tasks, result.event);

    return succeed({ ...next, status: "in_progress" });
  };
