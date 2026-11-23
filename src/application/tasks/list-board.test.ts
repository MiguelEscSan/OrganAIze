import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { listBoard } from "./list-board";

describe("listBoard", () => {
  it("groups every task by its status", async () => {
    const deps = createInMemoryDependencies({
      tasks: [
        buildTask({ id: "t1", status: "definition" }),
        buildTask({ id: "t2", status: "ready" }),
        buildTask({ id: "t3", status: "ready" }),
      ],
    });

    const board = await listBoard(deps)();

    expect(board.definition.map((task) => task.id)).toEqual(["t1"]);
    expect(board.ready.map((task) => task.id)).toEqual(["t2", "t3"]);
    expect(board.in_progress).toEqual([]);
    expect(board.review).toEqual([]);
  });

  it("returns empty columns when there are no tasks", async () => {
    const deps = createInMemoryDependencies();

    const board = await listBoard(deps)();

    expect(Object.values(board).every((column) => column.length === 0)).toBe(true);
  });
});
