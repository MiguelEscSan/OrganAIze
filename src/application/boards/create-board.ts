import type { Board } from "@/domain/boards/board";
import { normalizeBoardDetails } from "@/domain/boards/board";
import type { BoardDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { scaffoldProject, type ScaffoldDependencies } from "../projects/scaffold-project";
import { duplicateBoardReason } from "./board-messages";

export type CreateBoard = {
  kind: "CreateBoard";
  name: string;
  rootPath: string;
};

export type CreateBoardDependencies = BoardDependencies & ScaffoldDependencies;

export const createBoard =
  (deps: CreateBoardDependencies) =>
  async (command: CreateBoard): Promise<Outcome<Board>> => {
    const normalized = normalizeBoardDetails({ name: command.name, rootPath: command.rootPath }, deps.appRoot);

    if (!normalized.ok) {
      return fail(normalized.reason);
    }

    const board: Board = { id: deps.ids.next(), ...normalized.details };
    const saved = await deps.boards.save(board);

    if (saved !== "applied") {
      return fail(duplicateBoardReason);
    }

    await scaffoldProject(deps)({ kind: "ScaffoldProject", rootPath: board.rootPath });

    return succeed(board);
  };
