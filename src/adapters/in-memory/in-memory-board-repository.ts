import type { Board } from "@/domain/boards/board";
import type { BoardRepository } from "@/ports/board-repository";

export const createInMemoryBoardRepository = (seed: readonly Board[] = []): BoardRepository => {
  const boards = [...seed];

  return {
    list: async () => [...boards],

    save: async (board) => {
      if (boards.some((candidate) => candidate.id !== board.id && candidate.rootPath === board.rootPath)) {
        return "conflict";
      }

      const index = boards.findIndex((candidate) => candidate.id === board.id);

      if (index === -1) {
        boards.push(board);
      } else {
        boards[index] = board;
      }

      return "applied";
    },

    remove: async (boardId) => {
      const index = boards.findIndex((candidate) => candidate.id === boardId);

      if (index === -1) {
        return "conflict";
      }

      boards.splice(index, 1);

      return "applied";
    },
  };
};
