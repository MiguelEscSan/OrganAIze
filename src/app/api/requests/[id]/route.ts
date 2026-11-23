import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, readJsonObject, refused, succeeded } from "@/adapters/server/json-responses";
import type { Outcome } from "@/application/shared/outcome";
import type { Request as RequestEntity } from "@/domain/requests/request";

type RequestRouteContext = { params: Promise<{ id: string }> };

export const PUT = async (request: Request, context: RequestRouteContext): Promise<Response> => {
  const body = await readJsonObject(request);

  if (!body) {
    return refused("The request body must be a JSON object");
  }

  if (typeof body.title !== "string" || typeof body.description !== "string") {
    return refused("Title and description must be text");
  }

  try {
    const { id } = await context.params;
    const { mediator } = getAppServices();
    const outcome = await mediator.send<
      { kind: "EditRequest"; requestId: string; title: string; description: string },
      Outcome<RequestEntity>
    >({ kind: "EditRequest", requestId: id, title: body.title, description: body.description });

    return outcome.ok ? succeeded({ request: outcome.value }) : refused(outcome.reason);
  } catch (error) {
    return failedServer(error);
  }
};

export const DELETE = async (_request: Request, context: RequestRouteContext): Promise<Response> => {
  try {
    const { id } = await context.params;
    const { mediator } = getAppServices();
    const outcome = await mediator.send<{ kind: "DeleteRequest"; requestId: string }, Outcome<void>>({
      kind: "DeleteRequest",
      requestId: id,
    });

    return outcome.ok ? succeeded({}) : refused(outcome.reason);
  } catch (error) {
    return failedServer(error);
  }
};
