import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, succeeded } from "@/adapters/server/json-responses";
import type { RecordedTaskEvent } from "@/ports/event-log";

type TaskEventsRouteContext = { params: Promise<{ id: string }> };

export const GET = async (_request: Request, context: TaskEventsRouteContext): Promise<Response> => {
  try {
    const { id } = await context.params;
    const { mediator } = getAppServices();
    const events = await mediator.ask<{ kind: "ListTaskEvents"; taskId: string }, RecordedTaskEvent[]>({
      kind: "ListTaskEvents",
      taskId: id,
    });

    return succeeded({ events });
  } catch (error) {
    return failedServer(error);
  }
};
