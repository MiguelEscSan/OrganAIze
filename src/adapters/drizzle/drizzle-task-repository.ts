import { asc, notInArray } from "drizzle-orm";
import type { Task } from "@/domain/tasks/task";
import type { TaskRepository } from "@/ports/task-repository";
import type { Database } from "./client";
import { tasks } from "./schema";

type TaskRow = typeof tasks.$inferSelect;

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  requestId: row.requestId,
  title: row.title,
  description: row.description,
  status: row.status as Task["status"],
  assignedAgent: row.assignedAgent as Task["assignedAgent"],
  attempts: row.attempts,
  lastFeedback: row.lastFeedback,
  reviewReason: row.reviewReason as Task["reviewReason"],
});

const toRow = (task: Task) => ({
  id: task.id,
  requestId: task.requestId,
  title: task.title,
  description: task.description,
  status: task.status,
  assignedAgent: task.assignedAgent,
  attempts: task.attempts,
  lastFeedback: task.lastFeedback,
  reviewReason: task.reviewReason,
});

export const createDrizzleTaskRepository = (db: Database): TaskRepository => ({
  list: async (): Promise<Task[]> => {
    const rows = await db.select().from(tasks).orderBy(asc(tasks.position));

    return rows.map(toTask);
  },

  replaceAll: async (next) => {
    await db.transaction(async (tx) => {
      const keptIds = next.map((task) => task.id);

      await tx.delete(tasks).where(notInArray(tasks.id, keptIds.length > 0 ? keptIds : [""]));

      const current = await tx.select().from(tasks);
      const currentlyRunning = new Set(current.filter((row) => row.status === "in_progress").map((row) => row.id));
      const leavingFirst = [...next].sort(
        (left, right) => Number(currentlyRunning.has(right.id)) - Number(currentlyRunning.has(left.id)),
      );

      for (const task of leavingFirst) {
        const row = toRow(task);

        await tx
          .insert(tasks)
          .values(row)
          .onConflictDoUpdate({
            target: tasks.id,
            set: {
              requestId: row.requestId,
              title: row.title,
              description: row.description,
              status: row.status,
              assignedAgent: row.assignedAgent,
              attempts: row.attempts,
              lastFeedback: row.lastFeedback,
              reviewReason: row.reviewReason,
            },
          });
      }
    });
  },
});
