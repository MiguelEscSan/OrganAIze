import { asc } from "drizzle-orm";
import type { TaskEvent } from "@/domain/tasks/task-event";
import type { Clock } from "@/ports/clock";
import type { EventLog, RecordedTaskEvent } from "@/ports/event-log";
import type { Database } from "./client";
import { taskEvents } from "./schema";

export const createDrizzleEventLog = (db: Database, clock: Clock): EventLog => ({
  append: async (event: TaskEvent) => {
    await db.insert(taskEvents).values({
      taskId: event.taskId,
      fromStatus: event.from,
      toStatus: event.to,
      actor: event.actor,
      reason: event.reason,
      at: new Date(clock.now()),
    });
  },

  list: async (): Promise<RecordedTaskEvent[]> => {
    const rows = await db.select().from(taskEvents).orderBy(asc(taskEvents.id));

    return rows.map((row) => ({
      taskId: row.taskId,
      from: row.fromStatus as TaskEvent["from"],
      to: row.toStatus as TaskEvent["to"],
      actor: row.actor as TaskEvent["actor"],
      reason: row.reason,
      at: row.at.toISOString(),
    }));
  },
});
