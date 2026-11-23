import type { Task } from "@/domain/tasks/task";
import { deleteTask } from "@/domain/tasks/edit-task";
import { transitionTask } from "@/domain/tasks/transition-task";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { recordTransition } from "./record-transition";

export type ReviewDecisionKind = "send_to_ready" | "continue" | "delete";

export type DecideReview = {
  kind: "DecideReview";
  taskId: string;
  decision: ReviewDecisionKind;
};

export const decideReview =
  (deps: ApplicationDependencies) =>
  async (command: DecideReview): Promise<Outcome<Task | null>> => {
    const tasks = await deps.tasks.list();

    if (command.decision === "delete") {
      const removed = deleteTask(tasks, command.taskId);

      if (!removed.ok) {
        return fail(removed.reason);
      }

      await deps.tasks.replaceAll(removed.tasks);

      return succeed(null);
    }

    const target = command.decision === "continue" ? "in_progress" : "ready";
    const result = transitionTask(tasks, command.taskId, target, "user");

    if (!result.ok) {
      return fail(result.reason);
    }

    await recordTransition(deps, result.tasks, result.event);

    return succeed(result.tasks.find((task) => task.id === command.taskId) ?? null);
  };
