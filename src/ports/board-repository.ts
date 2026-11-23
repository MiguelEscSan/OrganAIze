import type { Board } from "@/domain/boards/board";
import type { WriteOutcome } from "@/ports/task-repository";

export type BoardRepository = {
  list(): Promise<Board[]>;
  save(board: Board): Promise<WriteOutcome>;
  remove(boardId: string): Promise<WriteOutcome>;
};
