import { getAppServices, resolveDefaultBoardId } from "@/adapters/server/app-services";
import { failedServer, refused, succeeded } from "@/adapters/server/json-responses";
import type { CreatedRequest } from "@/application/requests/create-request";
import type { Outcome } from "@/application/shared/outcome";

type CreateRequestBody = { title?: unknown; description?: unknown };

export const POST = async (request: Request): Promise<Response> => {
  try {
    const body = (await request.json()) as CreateRequestBody;
    const { mediator, boards } = getAppServices();
    const boardId = await resolveDefaultBoardId(boards);
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
