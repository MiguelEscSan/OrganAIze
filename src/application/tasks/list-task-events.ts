import type { RecordedTaskEvent } from "@/ports/event-log";
import type { ApplicationDependencies } from "../shared/dependencies";

export type ListTaskEvents = { kind: "ListTaskEvents"; taskId: string };

export const listTaskEvents =
  (deps: ApplicationDependencies) =>
  async (query: ListTaskEvents): Promise<RecordedTaskEvent[]> =>
    (await deps.events.list()).filter((event) => event.taskId === query.taskId);
