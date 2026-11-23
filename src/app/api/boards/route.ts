import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, readJsonObject, refused, succeeded } from "@/adapters/server/json-responses";
import { normalizeBoardDetails, type Board } from "@/domain/boards/board";

const duplicateBoardReason = "A board already uses this folder";

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
    const details = normalizeBoardDetails({ name: body.name, rootPath: body.rootPath }, process.cwd());

    if (!details.ok) {
      return refused(details.reason);
    }

    const board: Board = { id: randomUUID(), ...details.details };
    const saved = await getAppServices().boards.save(board);

    return saved === "applied" ? succeeded({ board }, 201) : refused(duplicateBoardReason);
  } catch (error) {
    return failedServer(error);
  }
};
