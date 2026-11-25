import type { Task } from "@/domain/tasks/task";
import { transitionTask } from "@/domain/tasks/transition-task";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { claimAndOrchestrateRequest, resumeSubtasks } from "./claim-and-orchestrate-request";
import type { OrchestrationDependencies } from "./orchestrate-request";
import { conflictReason, recordTransition } from "./record-transition";
import type { DevelopDependencies } from "./run-develop";

export type ReviewDecisionKind = "send_to_ready" | "continue" | "delete";

export type DecideReview = {
  kind: "DecideReview";
  taskId: string;
  decision: ReviewDecisionKind;
};

const deletableStatuses = ["definition", "review"] as const;

const sendSubtaskBackToWork = async (
  deps: OrchestrationDependencies & DevelopDependencies,
  before: Task,
): Promise<Outcome<Task | null>> => {
  const result = transitionTask(await deps.tasks.list(), before.id, "ready", "user");

  if (!result.ok) {
    return fail(result.reason);
  }

  const after = result.tasks.find((task) => task.id === before.id);

  if (!after) {
    return fail(conflictReason);
  }

  const working: Task = { ...after, status: "in_progress", attempts: 0, reviewReason: null };
  const event = { ...result.event, to: "in_progress" as const, reason: "Sent back to work by the user" };
  const recorded = await recordTransition(deps, before, working, event);

  if (!recorded.ok || before.parentTaskId === null) {
    return recorded;
  }

  await resumeSubtasks(deps)(before.parentTaskId);

  const current = (await deps.tasks.list()).find((task) => task.id === before.id);

  return current ? succeed(current) : recorded;
};

export const decideReview =
  (deps: OrchestrationDependencies & DevelopDependencies) =>
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

    if (before && command.decision === "send_to_ready" && before.parentTaskId !== null) {
      return sendSubtaskBackToWork(deps, before);
    }

    const target = command.decision === "continue" ? "in_progress" : "ready";
    const result = transitionTask(tasks, command.taskId, target, "user");

    if (!result.ok || !before) {
      return fail(result.ok ? "Task not found" : result.reason);
    }

    const after = result.tasks.find((task) => task.id === command.taskId);

    if (!after) {
      return fail(conflictReason);
    }

    const recorded = await recordTransition(deps, before, after, result.event);

    if (!recorded.ok || command.decision !== "send_to_ready") {
      return recorded;
    }

    await claimAndOrchestrateRequest(deps)();

    const current = (await deps.tasks.list()).find((task) => task.id === command.taskId);

    return current ? succeed(current) : recorded;
  };
