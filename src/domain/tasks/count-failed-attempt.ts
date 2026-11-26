import type { Task } from "./task";
import type { TaskEvent } from "./task-event";
import { statusAfterFailedAttempt, type FailureKind } from "./failure-kind";

export type FailedAttemptResult =
  | { ok: true; task: Task; event: TaskEvent }
  | { ok: false; reason: string };

export const countFailedAttempt = (
  tasks: readonly Task[],
  taskId: string,
  reason: string,
  kind: FailureKind,
): FailedAttemptResult => {
  const task = tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    return { ok: false, reason: "Task not found" };
  }

  if (task.status !== "in_progress") {
    return { ok: false, reason: "Only tasks in progress can count a failed attempt" };
  }

  const trimmedReason = reason.trim();

  if (trimmedReason.length === 0) {
    return { ok: false, reason: "A failed attempt needs a reason" };
  }

  const attempts = task.attempts + 1;
  const status = statusAfterFailedAttempt(attempts, kind);

  return {
    ok: true,
    task: {
      ...task,
      status,
      attempts,
      lastFeedback: trimmedReason,
      reviewReason: status === "review" ? "attempts" : null,
    },
    event: { taskId, from: "in_progress", to: status, actor: "system", reason: trimmedReason },
  };
};
