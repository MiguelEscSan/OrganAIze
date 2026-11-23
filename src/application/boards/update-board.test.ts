import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { updateBoard } from "./update-board";

const seedBoards = [
  { id: "board-1", name: "Landing", rootPath: "C:/projects/landing" },
  { id: "board-2", name: "Shop", rootPath: "C:/projects/shop" },
];

describe("updateBoard", () => {
  it("renames a board and changes its folder while keeping its id", async () => {
    const deps = createInMemoryDependencies({ boards: seedBoards });

    const outcome = await updateBoard(deps)({
      kind: "UpdateBoard",
      id: "board-1",
      name: "Landing page",
      rootPath: "C:/projects/landing-v2",
    });

    expect(outcome).toEqual({ ok: true, value: { id: "board-1", name: "Landing page", rootPath: "C:/projects/landing-v2" } });
    expect(await deps.boards.list()).toEqual([
      { id: "board-1", name: "Landing page", rootPath: "C:/projects/landing-v2" },
      { id: "board-2", name: "Shop", rootPath: "C:/projects/shop" },
    ]);
  });

  it("refuses a board that does not exist", async () => {
    const deps = createInMemoryDependencies({ boards: seedBoards });

    const outcome = await updateBoard(deps)({ kind: "UpdateBoard", id: "missing", name: "Ghost", rootPath: "C:/projects/ghost" });

    expect(outcome).toEqual({ ok: false, reason: "The project could not be found" });
    expect(await deps.boards.list()).toEqual(seedBoards);
  });

  it("refuses a folder that another board already uses", async () => {
    const deps = createInMemoryDependencies({ boards: seedBoards });

    const outcome = await updateBoard(deps)({ kind: "UpdateBoard", id: "board-2", name: "Shop", rootPath: "C:/projects/landing" });

    expect(outcome).toEqual({ ok: false, reason: "A board already uses this folder" });
    expect(await deps.boards.list()).toEqual(seedBoards);
  });

  it("refuses a relative project folder and keeps the stored board", async () => {
    const deps = createInMemoryDependencies({ boards: seedBoards });

    const outcome = await updateBoard(deps)({ kind: "UpdateBoard", id: "board-1", name: "Landing", rootPath: "landing" });

    expect(outcome).toEqual({ ok: false, reason: "The project root must be an absolute path" });
    expect(await deps.boards.list()).toEqual(seedBoards);
  });
});
