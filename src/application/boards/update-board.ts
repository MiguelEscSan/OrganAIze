import type { Board } from "@/domain/boards/board";
import { normalizeBoardDetails } from "@/domain/boards/board";
import type { BoardDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { duplicateBoardReason, missingBoardReason } from "./board-messages";

export type UpdateBoard = {
  kind: "UpdateBoard";
  id: string;
  name: string;
  rootPath?: string | null;
};

export const updateBoard =
  (deps: BoardDependencies) =>
  async (command: UpdateBoard): Promise<Outcome<Board>> => {
    const existing = (await deps.boards.list()).find((board) => board.id === command.id);

    if (!existing) {
      return fail(missingBoardReason);
    }

    const normalized = normalizeBoardDetails({ name: command.name, rootPath: command.rootPath }, deps.appRoot);

    if (!normalized.ok) {
      return fail(normalized.reason);
    }

    const board: Board = { id: existing.id, ...normalized.details };
    const saved = await deps.boards.save(board);

    return saved === "applied" ? succeed(board) : fail(duplicateBoardReason);
  };
