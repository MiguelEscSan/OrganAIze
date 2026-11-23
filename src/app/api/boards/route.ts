import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, readJsonObject, refused, succeeded } from "@/adapters/server/json-responses";
import type { Outcome } from "@/application/shared/outcome";
import type { Board } from "@/domain/boards/board";

export const GET = async (): Promise<Response> => {
  await connection();

  try {
    const { mediator } = getAppServices();
    const boards = await mediator.ask<{ kind: "ListBoards" }, Board[]>({ kind: "ListBoards" });

    return succeeded({ boards });
  } catch (error) {
    return failedServer(error);
  }
};

export const POST = async (request: Request): Promise<Response> => {
  const body = await readJsonObject(request);

  if (!body || typeof body.name !== "string" || typeof body.rootPath !== "string") {
    return refused("A board needs a name and a project root");
  }

  try {
    const { mediator } = getAppServices();
    const outcome = await mediator.send<{ kind: "CreateBoard"; name: string; rootPath: string }, Outcome<Board>>({
      kind: "CreateBoard",
      name: body.name,
      rootPath: body.rootPath,
    });

    return outcome.ok ? succeeded({ board: outcome.value }, 201) : refused(outcome.reason);
  } catch (error) {
    return failedServer(error);
  }
};
