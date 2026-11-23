import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, readJsonObject, refused, succeeded } from "@/adapters/server/json-responses";
import type { Outcome } from "@/application/shared/outcome";
import type { Board } from "@/domain/boards/board";

type BoardRouteContext = { params: Promise<{ id: string }> };

export const PUT = async (request: Request, context: BoardRouteContext): Promise<Response> => {
  const body = await readJsonObject(request);

  if (!body || typeof body.name !== "string" || typeof body.rootPath !== "string") {
    return refused("A board needs a name and a project root");
  }

  try {
    const { id } = await context.params;
    const { mediator } = getAppServices();
    const outcome = await mediator.send<{ kind: "UpdateBoard"; id: string; name: string; rootPath: string }, Outcome<Board>>({
      kind: "UpdateBoard",
      id,
      name: body.name,
      rootPath: body.rootPath,
    });

    return outcome.ok ? succeeded({ board: outcome.value }) : refused(outcome.reason);
  } catch (error) {
    return failedServer(error);
  }
};

export const DELETE = async (_request: Request, context: BoardRouteContext): Promise<Response> => {
  try {
    const { id } = await context.params;
    const { mediator } = getAppServices();
    const outcome = await mediator.send<{ kind: "DeleteBoard"; id: string }, Outcome<void>>({ kind: "DeleteBoard", id });

    return outcome.ok ? succeeded({}) : refused(outcome.reason);
  } catch (error) {
    return failedServer(error);
  }
};
