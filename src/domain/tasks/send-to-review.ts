import type { Task } from "./task";
import type { TaskEvent } from "./task-event";

export type SendToReviewResult =
  | { ok: true; task: Task; event: TaskEvent }
  | { ok: false; reason: string };

export const sendToReview = (tasks: readonly Task[], taskId: string, reason: string): SendToReviewResult => {
  const task = tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    return { ok: false, reason: "Task not found" };
  }

  if (task.status !== "in_progress") {
    return { ok: false, reason: "Only tasks in progress can be sent to review after a failure" };
  }

  const trimmedReason = reason.trim();

  if (trimmedReason.length === 0) {
    return { ok: false, reason: "A review needs a reason" };
  }

  return {
    ok: true,
    task: { ...task, status: "review", lastFeedback: trimmedReason, reviewReason: "orchestration" },
    event: { taskId, from: "in_progress", to: "review", actor: "system", reason: trimmedReason },
  };
};
