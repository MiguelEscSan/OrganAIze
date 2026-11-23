import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { deleteBoard } from "./delete-board";

const boards = [
  { id: "board-1", name: "Landing", rootPath: "C:/projects/landing" },
  { id: "board-2", name: "Shop", rootPath: "C:/projects/shop" },
];

describe("deleteBoard", () => {
  it("removes a board whose requests are not running", async () => {
    const deps = createInMemoryDependencies({
      boards,
      requests: [{ id: "request-1", boardId: "board-1", title: "Landing", description: "" }],
      tasks: [buildTask({ id: "task-1", requestId: "request-1", status: "ready" })],
    });

    const outcome = await deleteBoard(deps)({ kind: "DeleteBoard", id: "board-1" });

    expect(outcome).toEqual({ ok: true, value: undefined });
    expect(await deps.boards.list()).toEqual([boards[1]]);
  });

  it("refuses a board that does not exist", async () => {
    const deps = createInMemoryDependencies({ boards });

    const outcome = await deleteBoard(deps)({ kind: "DeleteBoard", id: "missing" });

    expect(outcome).toEqual({ ok: false, reason: "The project could not be found" });
    expect(await deps.boards.list()).toEqual(boards);
  });

  it("refuses to delete a board while one of its requests is in progress", async () => {
    const deps = createInMemoryDependencies({
      boards,
      requests: [{ id: "request-1", boardId: "board-1", title: "Landing", description: "" }],
      tasks: [buildTask({ id: "task-1", requestId: "request-1", status: "in_progress" })],
    });

    const outcome = await deleteBoard(deps)({ kind: "DeleteBoard", id: "board-1" });

    expect(outcome).toEqual({ ok: false, reason: "Wait until the running request in this project finishes" });
    expect(await deps.boards.list()).toEqual(boards);
  });

  it("refuses to delete a board while one of its requests is in QA", async () => {
    const deps = createInMemoryDependencies({
      boards,
      requests: [{ id: "request-1", boardId: "board-1", title: "Landing", description: "" }],
      tasks: [buildTask({ id: "task-1", requestId: "request-1", status: "qa" })],
    });

    const outcome = await deleteBoard(deps)({ kind: "DeleteBoard", id: "board-1" });

    expect(outcome).toEqual({ ok: false, reason: "Wait until the running request in this project finishes" });
  });

  it("ignores a running request that belongs to another board", async () => {
    const deps = createInMemoryDependencies({
      boards,
      requests: [{ id: "request-2", boardId: "board-2", title: "Shop", description: "" }],
      tasks: [buildTask({ id: "task-2", requestId: "request-2", status: "in_progress" })],
    });

    const outcome = await deleteBoard(deps)({ kind: "DeleteBoard", id: "board-1" });

    expect(outcome).toEqual({ ok: true, value: undefined });
  });
});
