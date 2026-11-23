import { eq, inArray } from "drizzle-orm";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { TaskStatus } from "@/domain/tasks/task-status";
import type { RequestRepository } from "@/ports/request-repository";
import type { WriteOutcome } from "@/ports/task-repository";
import type { Database } from "./client";
import { WriteConflict, runWrite } from "./write-outcome";
import { requests, tasks } from "./schema";

const toTaskRow = (task: Task) => ({
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

export const createDrizzleRequestRepository = (db: Database): RequestRepository => ({
  list: async (): Promise<Request[]> => db.select().from(requests),

  saveWithTasks: async (request, incoming) => {
    await db.transaction(async (tx) => {
      await tx
        .insert(requests)
        .values(request)
        .onConflictDoUpdate({
          target: requests.id,
          set: { title: request.title, description: request.description },
        });

      for (const task of incoming) {
        await tx
          .insert(tasks)
          .values(toTaskRow(task))
          .onConflictDoUpdate({
            target: tasks.id,
            set: { title: task.title, description: task.description },
          });
      }
    });
  },

  removeWithTasksIfStatuses: async (requestId, allowedStatuses: readonly TaskStatus[]): Promise<WriteOutcome> =>
    runWrite(() =>
      db.transaction(async (tx) => {
        const own = await tx.select().from(tasks).where(eq(tasks.requestId, requestId)).for("update");

        if (own.some((task) => !allowedStatuses.includes(task.status as TaskStatus))) {
          throw new WriteConflict();
        }

        await tx.delete(tasks).where(inArray(tasks.id, own.map((task) => task.id)));
        await tx.delete(requests).where(eq(requests.id, requestId));
      }),
    ),
});
