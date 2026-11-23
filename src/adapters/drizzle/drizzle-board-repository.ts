import type { Board } from "@/domain/boards/board";
import type { BoardRepository } from "@/ports/board-repository";
import type { Database } from "./client";
import { runWrite } from "./write-outcome";
import { boards } from "./schema";

export const createDrizzleBoardRepository = (db: Database): BoardRepository => ({
  list: async (): Promise<Board[]> => db.select().from(boards),

  save: async (board) =>
    runWrite(async () => {
      await db
        .insert(boards)
        .values(board)
        .onConflictDoUpdate({ target: boards.id, set: { name: board.name, rootPath: board.rootPath } });
    }),
});
