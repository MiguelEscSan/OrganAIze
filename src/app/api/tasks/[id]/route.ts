import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, readJsonObject, refused, succeeded } from "@/adapters/server/json-responses";
import type { Task } from "@/domain/tasks/task";
import type { Outcome } from "@/application/shared/outcome";

export const POST = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => {
  const body = await readJsonObject(request);

  if (!body) {
    return refused("The request body must be a JSON object");
  }

  try {
    const { id } = await context.params;
    const { mediator } = getAppServices();

    if (body.to === "ready") {
      const outcome = await mediator.send<{ kind: "ReleaseTaskToReady"; taskId: string }, Outcome<Task>>({
        kind: "ReleaseTaskToReady",
        taskId: id,
      });

      return outcome.ok ? succeeded({ task: outcome.value }) : refused(outcome.reason);
    }

    if (body.to === "definition") {
      const outcome = await mediator.send<{ kind: "MoveTask"; taskId: string; to: "definition" }, Outcome<Task>>({
        kind: "MoveTask",
        taskId: id,
        to: "definition",
      });

      return outcome.ok ? succeeded({ task: outcome.value }) : refused(outcome.reason);
    }

    return refused("Only moves to definition or ready are accepted here");
  } catch (error) {
    return failedServer(error);
  }
};
