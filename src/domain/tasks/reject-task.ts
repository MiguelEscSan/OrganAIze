import type { Task } from "./task";
import type { TaskEvent } from "./task-event";
import { statusAfterFailedAttempt, type FailureKind } from "./failure-kind";

export type RejectResult =
  | { ok: true; tasks: Task[]; event: TaskEvent }
  | { ok: false; reason: string };

export const rejectFromQa = (
  tasks: readonly Task[],
  taskId: string,
  feedback: string,
  kind: FailureKind,
): RejectResult => {
  const task = tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    return { ok: false, reason: "Task not found" };
  }

  if (task.status !== "qa") {
    return { ok: false, reason: "Only tasks in QA can be rejected" };
  }

  if (feedback.trim().length === 0) {
    return { ok: false, reason: "A rejection needs feedback" };
  }

  const trimmedFeedback = feedback.trim();
  const attempts = task.attempts + 1;
  const status = statusAfterFailedAttempt(attempts, kind);

  return {
    ok: true,
    tasks: tasks.map((candidate) =>
      candidate.id === taskId
        ? {
            ...candidate,
            status,
            attempts,
            lastFeedback: trimmedFeedback,
            reviewReason: status === "review" ? "attempts" : null,
          }
        : candidate,
    ),
    event: { taskId, from: "qa", to: status, actor: "system", reason: trimmedFeedback },
  };
};
