import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, refused, succeeded } from "@/adapters/server/json-responses";
import type { Outcome } from "@/application/shared/outcome";
import type { Task } from "@/domain/tasks/task";

type ResumeRouteContext = { params: Promise<{ id: string }> };

export const POST = async (_request: Request, context: ResumeRouteContext): Promise<Response> => {
  try {
    const { id } = await context.params;
    const { mediator } = getAppServices();
    const outcome = await mediator.send<{ kind: "ResumeSubtask"; taskId: string }, Outcome<Task>>({
      kind: "ResumeSubtask",
      taskId: id,
    });

    return outcome.ok ? succeeded({ task: outcome.value }) : refused(outcome.reason);
  } catch (error) {
    return failedServer(error);
  }
};
