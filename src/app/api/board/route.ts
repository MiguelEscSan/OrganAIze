import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, succeeded } from "@/adapters/server/json-responses";

const readBoardId = (request: Request): string | undefined =>
  new URL(request.url).searchParams.get("boardId")?.trim() || undefined;

export const GET = async (request: Request): Promise<Response> => {
  await connection();

  try {
    const { mediator } = getAppServices();
    const tasksByStatus = await mediator.ask({ kind: "ListBoard", boardId: readBoardId(request) });

    return succeeded({ tasksByStatus });
  } catch (error) {
    return failedServer(error);
  }
};
