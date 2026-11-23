import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createBoard } from "./create-board";

describe("createBoard", () => {
  it("stores a board with a generated id and normalized name and folder", async () => {
    const deps = createInMemoryDependencies();

    const outcome = await createBoard(deps)({ kind: "CreateBoard", name: "  Landing ", rootPath: " C:/projects/landing " });

    expect(outcome).toEqual({ ok: true, value: { id: "id-1", name: "Landing", rootPath: "C:/projects/landing" } });
    expect(await deps.boards.list()).toEqual([{ id: "id-1", name: "Landing", rootPath: "C:/projects/landing" }]);
  });

  it("refuses a relative project folder and stores nothing", async () => {
    const deps = createInMemoryDependencies();

    const outcome = await createBoard(deps)({ kind: "CreateBoard", name: "Landing", rootPath: "projects/landing" });

    expect(outcome).toEqual({ ok: false, reason: "The project root must be an absolute path" });
    expect(await deps.boards.list()).toEqual([]);
  });

  it("refuses a folder that another board already uses", async () => {
    const deps = createInMemoryDependencies({
      boards: [{ id: "board-1", name: "Landing", rootPath: "C:/projects/landing" }],
    });

    const outcome = await createBoard(deps)({ kind: "CreateBoard", name: "Copy", rootPath: "C:/projects/landing" });

    expect(outcome).toEqual({ ok: false, reason: "A board already uses this folder" });
    expect(await deps.boards.list()).toEqual([{ id: "board-1", name: "Landing", rootPath: "C:/projects/landing" }]);
  });
});
