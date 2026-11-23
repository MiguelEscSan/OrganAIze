import { eq } from "drizzle-orm";
import type { Request } from "@/domain/requests/request";
import type { RequestRepository } from "@/ports/request-repository";
import type { Database } from "./client";
import { requests } from "./schema";

export const createDrizzleRequestRepository = (db: Database): RequestRepository => ({
  list: async (): Promise<Request[]> => db.select().from(requests),

  save: async (request) => {
    await db
      .insert(requests)
      .values(request)
      .onConflictDoUpdate({
        target: requests.id,
        set: { title: request.title, description: request.description },
      });
  },

  remove: async (requestId) => {
    await db.delete(requests).where(eq(requests.id, requestId));
  },
});
