import { everySubtaskIs, subtasksOf } from "./request-subtasks";
import type { Task } from "./task";
import type { TransitionResult } from "./transition-task";

export const requestReadyForQa = (tasks: readonly Task[], requestId: string): TransitionResult => {
  const request = tasks.find((task) => task.id === requestId);

  if (!request) {
    return { ok: false, reason: "Task not found" };
  }

  if (request.parentTaskId !== null || request.status !== "in_progress") {
    return { ok: false, reason: "Only a request in progress can go to QA" };
  }

  if (!everySubtaskIs(subtasksOf(tasks, requestId), "awaiting_release")) {
    return { ok: false, reason: "Not every subtask is awaiting release" };
  }

  return {
    ok: true,
    tasks: tasks.map((task) => (task.id === requestId ? { ...task, status: "qa" } : task)),
    event: {
      taskId: requestId,
      from: "in_progress",
      to: "qa",
      actor: "system",
      reason: "Every subtask is awaiting release",
    },
  };
};
