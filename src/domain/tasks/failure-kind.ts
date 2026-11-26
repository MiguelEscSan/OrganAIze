import { maxAttemptsPerTask, maxMechanicalAttemptsPerTask } from "./task-status";

export type FailureKind = "mechanical" | "substantive";

export const attemptLimitFor = (kind: FailureKind): number =>
  kind === "mechanical" ? maxMechanicalAttemptsPerTask : maxAttemptsPerTask;

export const shownAttemptLimit = (attempts: number): number =>
  attempts > maxAttemptsPerTask ? maxMechanicalAttemptsPerTask : maxAttemptsPerTask;

export const statusAfterFailedAttempt = (attempts: number, kind: FailureKind): "review" | "in_progress" =>
  attempts >= attemptLimitFor(kind) ? "review" : "in_progress";
