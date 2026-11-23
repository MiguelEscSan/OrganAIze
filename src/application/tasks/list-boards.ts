import type { Board } from "@/domain/boards/board";
import type { BoardDependencies } from "../shared/dependencies";

export type ListBoards = { kind: "ListBoards" };

export const listBoards =
  (deps: BoardDependencies) =>
  async (_query: ListBoards): Promise<Board[]> =>
    deps.boards.list();
