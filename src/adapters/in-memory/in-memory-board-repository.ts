import type { Board } from "@/domain/boards/board";
import type { BoardRepository } from "@/ports/board-repository";

export const createInMemoryBoardRepository = (seed: readonly Board[] = []): BoardRepository => {
  const boards = [...seed];

  return {
    list: async () => [...boards],

    save: async (board) => {
      const index = boards.findIndex((candidate) => candidate.id === board.id);

      if (index === -1) {
        boards.push(board);
      } else {
        boards[index] = board;
      }

      return "applied";
    },
  };
};
