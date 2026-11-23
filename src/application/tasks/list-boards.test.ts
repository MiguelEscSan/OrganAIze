import { describe, expect, it } from "vitest";
import { createInMemoryBoardRepository } from "@/adapters/in-memory/in-memory-board-repository";
import { listBoards } from "./list-boards";

describe("listBoards", () => {
  it("returns every saved board", async () => {
    const boards = createInMemoryBoardRepository([
      { id: "board-1", name: "Landing", rootPath: "C:/projects/landing" },
      { id: "board-2", name: "Shop", rootPath: "C:/projects/shop" },
    ]);

    const result = await listBoards({ boards })();

    expect(result.map((board) => board.id)).toEqual(["board-1", "board-2"]);
  });

  it("returns an empty list when no board exists", async () => {
    const boards = createInMemoryBoardRepository();

    expect(await listBoards({ boards })()).toEqual([]);
  });
});
