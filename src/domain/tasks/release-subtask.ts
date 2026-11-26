import type { Task } from "./task";
import { transitionTask, type TransitionResult } from "./transition-task";

export const releaseSubtask = (tasks: readonly Task[], subtaskId: string): TransitionResult => {
  const subtask = tasks.find((task) => task.id === subtaskId);

  if (subtask && subtask.parentTaskId === null) {
    return { ok: false, reason: "Only a subtask can wait for release" };
  }

  return transitionTask(tasks, subtaskId, "awaiting_release", "system");
};
