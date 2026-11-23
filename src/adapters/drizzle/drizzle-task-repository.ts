import { and, asc, eq, inArray } from "drizzle-orm";
import type { Task } from "@/domain/tasks/task";
import type { TaskStatus } from "@/domain/tasks/task-status";
import type { TaskRepository, TransitionWrite, WriteOutcome } from "@/ports/task-repository";
import type { Database } from "./client";
import { WriteConflict, runWrite } from "./write-outcome";
import { taskEvents, tasks } from "./schema";

type TaskRow = typeof tasks.$inferSelect;

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  requestId: row.requestId,
  title: row.title,
  description: row.description,
  status: row.status as TaskStatus,
  assignedAgent: row.assignedAgent as Task["assignedAgent"],
  attempts: row.attempts,
  lastFeedback: row.lastFeedback,
  reviewReason: row.reviewReason as Task["reviewReason"],
});

export const createDrizzleTaskRepository = (db: Database): TaskRepository => ({
  list: async (): Promise<Task[]> => {
    const rows = await db.select().from(tasks).orderBy(asc(tasks.position));

    return rows.map(toTask);
  },

  applyTransition: async ({ task, expectedStatus, event }: TransitionWrite): Promise<WriteOutcome> =>
    runWrite(() =>
      db.transaction(async (tx) => {
        const updated = await tx
          .update(tasks)
          .set({
            status: task.status,
            assignedAgent: task.assignedAgent,
            attempts: task.attempts,
            lastFeedback: task.lastFeedback,
            reviewReason: task.reviewReason,
          })
          .where(and(eq(tasks.id, task.id), eq(tasks.status, expectedStatus)))
          .returning({ id: tasks.id });

        if (updated.length === 0) {
          throw new WriteConflict();
        }

        await tx.insert(taskEvents).values({
          taskId: event.taskId,
          fromStatus: event.from,
          toStatus: event.to,
          actor: event.actor,
          reason: event.reason,
          at: new Date(),
        });
      }),
    ),

  removeIfStatus: async (taskId: string, allowedStatuses: readonly TaskStatus[]): Promise<WriteOutcome> =>
    runWrite(async () => {
      const deleted = await db
        .delete(tasks)
        .where(and(eq(tasks.id, taskId), inArray(tasks.status, [...allowedStatuses])))
        .returning({ id: tasks.id });

      if (deleted.length === 0) {
        throw new WriteConflict();
      }
    }),
});
