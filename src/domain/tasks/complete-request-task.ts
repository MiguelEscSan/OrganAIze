import type { Task } from "./task";
import type { TransitionResult } from "./transition-task";

const allSubtasksDone = (tasks: readonly Task[], requestTaskId: string): boolean => {
  const subtasks = tasks.filter((task) => task.parentTaskId === requestTaskId);

  return subtasks.length > 0 && subtasks.every((task) => task.status === "deploy");
};

export const completeRequestTask = (tasks: readonly Task[], requestTaskId: string): TransitionResult => {
  const request = tasks.find((task) => task.id === requestTaskId);

  if (!request) {
    return { ok: false, reason: "Task not found" };
  }

  if (request.parentTaskId !== null || request.status !== "in_progress") {
    return { ok: false, reason: "Only a request task in progress can be completed" };
  }

  if (!allSubtasksDone(tasks, requestTaskId)) {
    return { ok: false, reason: "Not every subtask is in deploy" };
  }

  return {
    ok: true,
    tasks: tasks.map((task) => (task.id === requestTaskId ? { ...task, status: "deploy" } : task)),
    event: {
      taskId: requestTaskId,
      from: "in_progress",
      to: "deploy",
      actor: "system",
      reason: "All subtasks reached deploy",
    },
  };
};
