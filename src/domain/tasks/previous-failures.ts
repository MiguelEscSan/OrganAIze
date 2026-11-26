import type { TaskEvent } from "./task-event";

export type PreviousFailure = { attempt: number; reason: string };

export const maxRememberedFailures = 5;

const creationReasonPrefix = "Created from ";

export const creationReason = (parentTaskId: string): string =>
  `${creationReasonPrefix}${parentTaskId} by the orchestrator`;

const isCreation = (event: TaskEvent): boolean => event.reason.startsWith(creationReasonPrefix);

const returnedTaskToDevelop = (event: TaskEvent): boolean =>
  event.actor === "system" && event.to === "in_progress" && (event.from === "qa" || event.from === "in_progress");

export const previousFailuresOf = (events: readonly TaskEvent[], taskId: string): PreviousFailure[] =>
  events
    .filter((event) => event.taskId === taskId && returnedTaskToDevelop(event) && !isCreation(event))
    .map((event, index) => ({ attempt: index + 1, reason: event.reason }))
    .slice(-maxRememberedFailures);
