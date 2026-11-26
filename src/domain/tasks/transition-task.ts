import type { Actor } from "./actor";
import type { Task } from "./task";
import type { TaskEvent } from "./task-event";
import type { TaskStatus } from "./task-status";

export type TransitionResult =
  | { ok: true; tasks: Task[]; event: TaskEvent }
  | { ok: false; reason: string };

const userMoves: ReadonlyArray<readonly [TaskStatus, TaskStatus]> = [
  ["definition", "ready"],
  ["ready", "definition"],
  ["review", "ready"],
  ["review", "in_progress"],
];

const systemMoves: ReadonlyArray<readonly [TaskStatus, TaskStatus]> = [
  ["ready", "in_progress"],
  ["in_progress", "qa"],
  ["qa", "deploy"],
  ["qa", "awaiting_release"],
  ["awaiting_release", "deploy"],
  ["awaiting_release", "in_progress"],
];

const allowedMovesFor = (actor: Actor) => (actor === "user" ? userMoves : systemMoves);

const isAllowed = (actor: Actor, from: TaskStatus, to: TaskStatus) =>
  allowedMovesFor(actor).some(([source, target]) => source === from && target === to);

const statusesOfARequestInFlight: readonly TaskStatus[] = ["in_progress", "qa", "awaiting_release"];

const occupiesProgress = (candidateStatus: TaskStatus, movingFrom: TaskStatus): boolean =>
  movingFrom === "ready" ? statusesOfARequestInFlight.includes(candidateStatus) : candidateStatus === "in_progress";

export const transitionTask = (
  tasks: readonly Task[],
  taskId: string,
  to: TaskStatus,
  actor: Actor,
): TransitionResult => {
  const task = tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    return { ok: false, reason: "Task not found" };
  }

  if (!isAllowed(actor, task.status, to)) {
    return { ok: false, reason: `${actor} cannot move a task from ${task.status} to ${to}` };
  }

  const movesIntoProgress = to === "in_progress";
  const progressTaken = tasks.some((candidate) => occupiesProgress(candidate.status, task.status));

  if (movesIntoProgress && progressTaken) {
    return { ok: false, reason: "Another task is already in progress" };
  }

  if (actor === "user" && task.status === "review" && to === "in_progress" && task.reviewReason !== "budget") {
    return { ok: false, reason: "Only a task stopped by budget can be continued" };
  }

  return {
    ok: true,
    tasks: tasks.map((candidate) =>
      candidate.id === taskId
        ? {
            ...candidate,
            status: to,
            attempts: task.status === "review" && to === "ready" ? 0 : candidate.attempts,
            reviewReason: task.status === "review" ? null : candidate.reviewReason,
          }
        : candidate,
    ),
    event: { taskId, from: task.status, to, actor, reason: `Moved by ${actor}` },
  };
};
