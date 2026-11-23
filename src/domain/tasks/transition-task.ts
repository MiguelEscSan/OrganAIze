import type { Actor } from "./actor";
import type { Task } from "./task";
import type { TaskStatus } from "./task-status";

export type TransitionResult =
  | { ok: true; tasks: Task[] }
  | { ok: false; reason: string };

const userMoves: ReadonlyArray<readonly [TaskStatus, TaskStatus]> = [
  ["definition", "ready"],
  ["ready", "definition"],
];

const systemMoves: ReadonlyArray<readonly [TaskStatus, TaskStatus]> = [
  ["ready", "in_progress"],
  ["in_progress", "qa"],
  ["qa", "in_progress"],
  ["qa", "deploy"],
];

const allowedMovesFor = (actor: Actor) => (actor === "user" ? userMoves : systemMoves);

const isAllowed = (actor: Actor, from: TaskStatus, to: TaskStatus) =>
  allowedMovesFor(actor).some(([source, target]) => source === from && target === to);

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
  const progressTaken = tasks.some((candidate) => candidate.status === "in_progress");

  if (movesIntoProgress && progressTaken) {
    return { ok: false, reason: "Another task is already in progress" };
  }

  return {
    ok: true,
    tasks: tasks.map((candidate) =>
      candidate.id === taskId ? { ...candidate, status: to } : candidate,
    ),
  };
};
