import type { Task } from "@/domain/tasks/task";
import { transitionTask } from "@/domain/tasks/transition-task";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { conflictReason, recordTransition } from "./record-transition";

export type ReviewDecisionKind = "send_to_ready" | "continue" | "delete";

export type DecideReview = {
  kind: "DecideReview";
  taskId: string;
  decision: ReviewDecisionKind;
};

const deletableStatuses = ["definition", "review"] as const;

export const decideReview =
  (deps: ApplicationDependencies) =>
  async (command: DecideReview): Promise<Outcome<Task | null>> => {
    if (command.decision === "delete") {
      const tasks = await deps.tasks.list();

      if (!tasks.some((task) => task.id === command.taskId)) {
        return fail("Task not found");
      }

      const outcome = await deps.tasks.removeIfStatus(command.taskId, deletableStatuses);

      return outcome === "applied" ? succeed(null) : fail("Only tasks in definition or review can be deleted");
    }

    const tasks = await deps.tasks.list();
    const before = tasks.find((task) => task.id === command.taskId);
    const target = command.decision === "continue" ? "in_progress" : "ready";
    const result = transitionTask(tasks, command.taskId, target, "user");

    if (!result.ok || !before) {
      return fail(result.ok ? "Task not found" : result.reason);
    }

    const after = result.tasks.find((task) => task.id === command.taskId);

    if (!after) {
      return fail(conflictReason);
    }

    return recordTransition(deps, before, after, result.event);
  };
