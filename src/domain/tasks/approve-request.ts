import type { RequestTransitionResult } from "./request-transition-result";
import { everySubtaskIs, subtasksOf } from "./request-subtasks";
import type { Task } from "./task";
import type { TaskEvent } from "./task-event";

const deployEvent = (task: Task, reason: string): TaskEvent => ({
  taskId: task.id,
  from: task.status,
  to: "deploy",
  actor: "system",
  reason,
});

export const approveRequest = (tasks: readonly Task[], requestId: string): RequestTransitionResult => {
  const request = tasks.find((task) => task.id === requestId);

  if (!request) {
    return { ok: false, reason: "Task not found" };
  }

  if (request.parentTaskId !== null || request.status !== "qa") {
    return { ok: false, reason: "Only a request in QA can be approved" };
  }

  const subtasks = subtasksOf(tasks, requestId);

  if (!everySubtaskIs(subtasks, "awaiting_release")) {
    return { ok: false, reason: "Not every subtask is awaiting release" };
  }

  const approved = new Set([request, ...subtasks].map((task) => task.id));

  return {
    ok: true,
    tasks: tasks.map((task) => (approved.has(task.id) ? { ...task, status: "deploy" } : task)),
    events: [
      deployEvent(request, "Request QA passed"),
      ...subtasks.map((subtask) => deployEvent(subtask, "Released with its request")),
    ],
  };
};
