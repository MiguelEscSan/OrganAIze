import { getAppServices, resolveDefaultBoardId } from "@/adapters/server/app-services";
import { failedServer, readJsonObject, refused, succeeded } from "@/adapters/server/json-responses";
import { hasOptionalRequestText } from "@/adapters/server/request-body";
import type { CreatedRequest } from "@/application/requests/create-request";
import type { Outcome } from "@/application/shared/outcome";
import type { BoardRepository } from "@/ports/board-repository";

const requestedBoardId = async (body: Record<string, unknown>, boards: BoardRepository): Promise<string | null> => {
  if (body.boardId === undefined) {
    return resolveDefaultBoardId(boards);
  }

  return typeof body.boardId === "string" ? body.boardId : null;
};

const noBoardReason = "Create a project before adding a request";

export const POST = async (request: Request): Promise<Response> => {
  const body = await readJsonObject(request);

  if (!body) {
    return refused("The request body must be a JSON object");
  }

  if (!hasOptionalRequestText(body)) {
    return refused("Title and description must be text");
  }

  try {
    const { mediator, boards } = getAppServices();
    const boardId = await requestedBoardId(body, boards);

    if (boardId === null) {
      return refused(body.boardId === undefined ? noBoardReason : "The board must be text");
    }

    const outcome = await mediator.send<{ kind: "CreateRequest"; boardId: string; title: string; description: string }, Outcome<CreatedRequest>>({
      kind: "CreateRequest",
      boardId,
      title: typeof body.title === "string" ? body.title : "",
      description: typeof body.description === "string" ? body.description : "",
    });

    return outcome.ok ? succeeded({ created: outcome.value }, 201) : refused(outcome.reason);
  } catch (error) {
    return failedServer(error);
  }
};
