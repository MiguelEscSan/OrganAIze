import type { RequestTransitionResult } from "./request-transition-result";
import { subtasksOf } from "./request-subtasks";
import type { Task } from "./task";
import type { TaskEvent } from "./task-event";

export type RequestFailure = { criterion: string; file: string | null; message: string };

const failureText = (failure: RequestFailure): string =>
  failure.file === null
    ? `${failure.criterion}: ${failure.message}`
    : `${failure.criterion} (${failure.file}): ${failure.message}`;

const numbered = (items: readonly string[]): string => items.map((item, index) => `${index + 1}. ${item}`).join("\n");

const declaresFile = (subtask: Task, file: string): boolean => subtask.files.includes(file);

const attributedFile = (failure: RequestFailure, subtasks: readonly Task[]): string | null =>
  failure.file !== null && subtasks.some((subtask) => declaresFile(subtask, failure.file ?? "")) ? failure.file : null;

const isResponsible = (subtask: Task, failure: RequestFailure, subtasks: readonly Task[]): boolean => {
  const file = attributedFile(failure, subtasks);

  return file === null || declaresFile(subtask, file);
};

const failuresOf = (subtask: Task, failures: readonly RequestFailure[], subtasks: readonly Task[]): RequestFailure[] =>
  failures.filter((failure) => isResponsible(subtask, failure, subtasks));

const returnSubtask = (subtask: Task, feedback: string, maxAttemptsPerTask: number): Task => {
  const attempts = subtask.attempts + 1;
  const status = attempts >= maxAttemptsPerTask ? "review" : "in_progress";

  return { ...subtask, status, attempts, lastFeedback: feedback, reviewReason: status === "review" ? "attempts" : null };
};

export const rejectRequest = (
  tasks: readonly Task[],
  requestId: string,
  failures: readonly RequestFailure[],
  maxAttemptsPerTask: number,
): RequestTransitionResult => {
  const request = tasks.find((task) => task.id === requestId);

  if (!request) {
    return { ok: false, reason: "Task not found" };
  }

  if (request.parentTaskId !== null || request.status !== "qa") {
    return { ok: false, reason: "Only a request in QA can be rejected" };
  }

  if (failures.length === 0) {
    return { ok: false, reason: "A rejection needs at least one failure" };
  }

  const subtasks = subtasksOf(tasks, requestId);
  const returned = new Map<string, Task>();
  const events: TaskEvent[] = [
    { taskId: requestId, from: "qa", to: "in_progress", actor: "system", reason: "Request QA failed" },
  ];

  for (const subtask of subtasks) {
    const own = failuresOf(subtask, failures, subtasks);

    if (own.length === 0) {
      continue;
    }

    const feedback = numbered(own.map(failureText));
    const updated = returnSubtask(subtask, feedback, maxAttemptsPerTask);
    returned.set(subtask.id, updated);
    events.push({ taskId: subtask.id, from: "awaiting_release", to: updated.status, actor: "system", reason: feedback });
  }

  return {
    ok: true,
    tasks: tasks.map((task) => (task.id === requestId ? { ...task, status: "in_progress" } : (returned.get(task.id) ?? task))),
    events,
  };
};
