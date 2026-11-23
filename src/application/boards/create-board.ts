import type { Board } from "@/domain/boards/board";
import { normalizeBoardDetails } from "@/domain/boards/board";
import type { BoardDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { duplicateBoardReason } from "./board-messages";

export type CreateBoard = {
  kind: "CreateBoard";
  name: string;
  rootPath: string;
};

export const createBoard =
  (deps: BoardDependencies) =>
  async (command: CreateBoard): Promise<Outcome<Board>> => {
    const normalized = normalizeBoardDetails({ name: command.name, rootPath: command.rootPath }, deps.appRoot);

    if (!normalized.ok) {
      return fail(normalized.reason);
    }

    const board: Board = { id: deps.ids.next(), ...normalized.details };
    const saved = await deps.boards.save(board);

    return saved === "applied" ? succeed(board) : fail(duplicateBoardReason);
  };
